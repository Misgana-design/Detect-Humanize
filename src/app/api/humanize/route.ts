import crypto from "crypto";
import { NextResponse } from "next/server";
import { getPlanDefinition } from "@/lib/billing/plans";
import { createServerSupabaseClient, createServiceSupabaseClient } from "@/lib/supabase/server";
import { HumanizerService, Tone, HumanizerTier } from "@/services/ai/humanizerService";
import { NewPromptTestService } from "@/services/ai/newPromptTestService";
import { normalizeLanguage } from "@/lib/languages";
import { logHumanizationFailure } from "@/lib/server/humanizationFailureLog";
import type { DetectorTarget } from "@/hooks/useHumanizer";

export const maxDuration = 180;
export const runtime = "nodejs";

type HumanizeRequestBody = {
  text?: unknown;
  tone?: unknown;
  language?: unknown;
  documentId?: unknown;
  detectorTarget?: unknown;
};

const VALID_DETECTOR_TARGETS = new Set<DetectorTarget>(["other", "test"]);

const VALID_TONES = new Set<Tone>([
  "standard",
  "casual",
  "professional",
  "academic",
  "formal",
  "creative",
  "friendly",
  "storytelling",
]);

async function parseHumanizeBody(req: Request): Promise<HumanizeRequestBody> {
  try {
    return (await req.json()) as HumanizeRequestBody;
  } catch {
    throw Object.assign(new Error("Invalid request body. Please refresh and try again."), {
      status: 400,
    });
  }
}

function getStatus(error: unknown) {
  return typeof error === "object" &&
    error !== null &&
    "status" in error &&
    typeof (error as { status?: unknown }).status === "number"
    ? (error as { status: number }).status
    : 500;
}

function getPublicErrorMessage(error: unknown, status: number) {
  if (status >= 400 && status < 500 && error instanceof Error) {
    return error.message;
  }

  if (status === 503) {
    return "AI is currently busy. Try again in a few seconds.";
  }

  return "We could not humanize this text right now. Please try again.";
}

export async function POST(req: Request) {
  // Hoisted above the try block so the catch can attach request context
  // (user, size, detector) to the humanization_failures log row.
  let userId: string | null = null;
  let wordCount = 0;
  let detectorTarget: DetectorTarget = "other";

  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Please sign in to humanize text" },
        { status: 401 },
      );
    }
    userId = user.id;

    const body = await parseHumanizeBody(req);
    const text = typeof body.text === "string" ? body.text : "";
    const tone: Tone =
      typeof body.tone === "string" && VALID_TONES.has(body.tone as Tone)
        ? (body.tone as Tone)
        : "casual";
    const language = normalizeLanguage(body.language);
    const documentId =
      typeof body.documentId === "string" && body.documentId.trim()
        ? body.documentId
        : undefined;
    detectorTarget =
      typeof body.detectorTarget === "string" &&
      VALID_DETECTOR_TARGETS.has(body.detectorTarget as DetectorTarget)
        ? (body.detectorTarget as DetectorTarget)
        : "other";
    wordCount = text?.trim() ? text.trim().split(/\s+/).length : 0;

    if (!text || text.trim() === "") {
      return NextResponse.json({ error: "Text is required." }, { status: 400 });
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return NextResponse.json(
        { error: "We could not load your account. Please sign in again." },
        { status: 401 },
      );
    }

    const plan = getPlanDefinition(profile?.subscription_tier);
    const wordsUsed = profile?.words_used ?? 0;
    const extraCredits = profile?.extra_credits ?? 0;

    if (plan.maxWordsPerInput !== null && wordCount > plan.maxWordsPerInput) {
      return NextResponse.json(
        {
          error: `${plan.name} allows up to ${plan.maxWordsPerInput.toLocaleString()} words per input.`,
        },
        { status: 403 },
      );
    }

    // Total available = remaining monthly/weekly quota + purchased extra credits.
    const quotaRemaining =
      plan.wordQuota === null ? null : Math.max(plan.wordQuota - wordsUsed, 0);
    const availableWords =
      quotaRemaining === null ? null : quotaRemaining + extraCredits;

    if (availableWords !== null && wordCount > availableWords) {
      return NextResponse.json(
        {
          error: `${plan.name} includes ${plan.wordQuota?.toLocaleString() ?? "..."} words per ${
            plan.quotaPeriod === "week" ? "week" : "month"
          }.${
            extraCredits > 0
              ? ` You have ${extraCredits.toLocaleString()} bonus credit${extraCredits === 1 ? "" : "s"} remaining.`
              : " You've used your quota for this period."
          }`,
        },
        { status: 402 },
      );
    }

    const cacheKey = crypto
      .createHash("sha256")
      .update(`${text.trim()}_${tone}_${language}`)
      .digest("hex");

    const { data: cachedResult } = await supabase
      .from("humanization_cache")
      .select("result")
      .eq("hash", cacheKey)
      .maybeSingle();

    let aiResult;
    let isCached = false;

    if (cachedResult) {
      aiResult = cachedResult.result;
      isCached = true;
    } else {
      const humanizerTier: HumanizerTier =
        plan.tier === "free"
          ? "free"
          : plan.tier === "basic"
            ? "basic"
            : "pro";

      aiResult =
        detectorTarget === "test"
          ? await NewPromptTestService.rewrite(text, tone, humanizerTier)
          : await HumanizerService.rewrite(text, tone, humanizerTier, language);
    }

    if (
      !aiResult ||
      typeof aiResult.humanizedText !== "string" ||
      !Array.isArray(aiResult.changes)
    ) {
      throw new Error("AI returned an invalid humanization response.");
    }

    const parallelTasks: Promise<void | null>[] = [
      (async () => {
        // Use service client to bypass RLS on the RPC call
        const serviceClient = createServiceSupabaseClient();
        const { error } = await serviceClient.rpc("consume_plan_usage", {
          user_id_input: user.id,
          words_to_add: wordCount,
        });
        if (error) throw error;
      })(),
    ];

    if (!isCached) {
      parallelTasks.push(
        (async () => {
          const { error } = await supabase.from("humanization_cache").upsert({
            hash: cacheKey,
            result: aiResult,
          });
          if (error) throw error;
        })(),
      );
    }

    if (documentId) {
      parallelTasks.push(
        (async () => {
          const { error } = await supabase
            .from("documents")
            .update({
              humanized_content: aiResult.humanizedText,
              tone_used: tone,
              language,
            })
            .eq("id", documentId)
            .eq("user_id", user.id);
          if (error) throw error;
        })(),
      );
    } else {
      const generatedTitle =
        text
          .split(/\s+/)
          .slice(0, 6)
          .join(" ")
          .replace(/[^\w\s]/gi, "") + "...";

      parallelTasks.push(
        (async () => {
          const { error } = await supabase.from("documents").insert({
            user_id: user.id,
            title: generatedTitle,
            original_content: text,
            humanized_content: aiResult.humanizedText,
            tone_used: tone,
            language,
          });
          if (error) throw error;
        })(),
      );
    }

    await Promise.all(parallelTasks);

    return NextResponse.json({ ...aiResult, cached: isCached });
  } catch (error: unknown) {
    const status = getStatus(error);
    const message = getPublicErrorMessage(error, status);
    console.error("Humanizer API Error:", error);

    // Best-effort: record the failure so it is queryable in SQL
    // (quota 402s and validation errors never reach this catch —
    // they return early, so this captures genuine system failures).
    await logHumanizationFailure({
      userId,
      source: "humanize",
      message: error instanceof Error ? error.message : String(error),
      status,
      wordCount: wordCount > 0 ? wordCount : null,
      detectorTarget,
    });

    return NextResponse.json(
      { error: message },
      { status },
    );
  }
}
