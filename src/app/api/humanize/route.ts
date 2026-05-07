import crypto from "crypto";
import { NextResponse } from "next/server";
import { getPlanDefinition, getRemainingWords } from "@/lib/billing/plans";
import { createServerSupabaseClient, createServiceSupabaseClient } from "@/lib/supabase/server";
import { HumanizerService, Tone, HumanizerTier } from "@/services/ai/humanizerService";
import { runWithPriority } from "@/lib/queue/humanizeQueue";
import { sendHumanizationEmail } from "@/services/email/emailService";

export const maxDuration = 60;

export async function POST(req: Request) {
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

    const body = await req.json();
    const text: string = body.text;
    const tone: Tone = body.tone || "default";
    const documentId: string | undefined = body.documentId;
    const wordCount = text?.trim() ? text.trim().split(/\s+/).length : 0;

    if (!text || text.trim() === "") {
      return NextResponse.json({ error: "Text is required." }, { status: 400 });
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    const plan = getPlanDefinition(profile?.subscription_tier);
    const wordsUsed = profile?.words_used ?? 0;

    if (plan.maxWordsPerInput !== null && wordCount > plan.maxWordsPerInput) {
      return NextResponse.json(
        {
          error: `${plan.name} allows up to ${plan.maxWordsPerInput.toLocaleString()} words per input.`,
        },
        { status: 403 },
      );
    }

    if (plan.wordQuota !== null && wordsUsed + wordCount > plan.wordQuota) {
      return NextResponse.json(
        {
          error: `${plan.name} includes ${plan.wordQuota.toLocaleString()} words per ${plan.quotaPeriod}.`,
        },
        { status: 402 },
      );
    }

    const cacheKey = crypto
      .createHash("sha256")
      .update(`${text.trim()}_${tone}`)
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
      // Determine humanizer tier: free → 1-stage Flash, basic → 3-stage Flash, pro+ → 3-stage Pro
      const humanizerTier: HumanizerTier =
        plan.tier === "free"
          ? "free"
          : plan.tier === "basic"
            ? "basic"
            : "pro";

      const isPaid = plan.tier !== "free";

      // Run through priority queue — paid users get high priority
      aiResult = await runWithPriority(
        () => HumanizerService.rewrite(text, tone, humanizerTier),
        isPaid,
      );
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
          });
          if (error) throw error;
        })(),
      );
    }

    await Promise.all(parallelTasks);

    // Send notification email (fire-and-forget — never block the response)
    if (user.email) {
      const remaining = getRemainingWords(plan.tier, wordsUsed + wordCount);
      void sendHumanizationEmail({
        to: user.email,
        name: profile?.full_name || user.email.split("@")[0] || "there",
        wordCount,
        tone,
        planName: plan.name,
        wordsRemaining: remaining,
        changes: aiResult.changes ?? [],
      }).catch((err) => console.error("[email] Humanization email failed:", err));
    }

    return NextResponse.json({ ...aiResult, cached: isCached });
  } catch (error: unknown) {
    console.error("Humanizer API Error:", error);
    return NextResponse.json(
      { error: "Failed to process text" },
      { status: 500 },
    );
  }
}
