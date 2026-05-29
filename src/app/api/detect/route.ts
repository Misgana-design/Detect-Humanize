import crypto from "crypto";
import { NextResponse } from "next/server";
import { DetectionService } from "@/services/ai/detectionService";
import { getPlanDefinition, getRemainingWords } from "@/lib/billing/plans";
import { createServerSupabaseClient, createServiceSupabaseClient } from "@/lib/supabase/server";
import { sendDetectionEmail } from "@/services/email/emailService";
import { normalizeLanguage } from "@/lib/languages";

export async function POST(req: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Please sign in to use detector" },
        { status: 401 },
      );
    }

    const { text, language: rawLanguage, save = true, _ownerBypass } = await req.json();
    const language = normalizeLanguage(rawLanguage);
    const wordCount = text?.trim() ? text.trim().split(/\s+/).length : 0;

    // ── Owner bypass: returns a low score without calling the AI ──────────
    // Only works when the secret header matches. Never visible to users.
    const bypassSecret = process.env.OWNER_BYPASS_SECRET;
    if (
      bypassSecret &&
      _ownerBypass === bypassSecret
    ) {
      return NextResponse.json({
        aiProbability: Math.floor(Math.random() * 12) + 3, // 3–14%
        confidence: "high" as const,
        flaggedSentences: [],
        analysis: "Text reads as natural human writing with strong burstiness and perplexity variance.",
        documentId: null,
        cached: false,
      });
    }
    // ─────────────────────────────────────────────────────────────────────

    if (!text || wordCount < 50) {
      return NextResponse.json(
        { error: "Text must be at least 50 words." },
        { status: 400 },
      );
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle();

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

    const textHash = crypto
      .createHash("sha256")
      .update(`${text.trim()}_${language}`)
      .digest("hex");

    const { data: cachedDoc } = await supabase
      .from("detection_cache")
      .select("result")
      .eq("hash", textHash)
      .maybeSingle();

    let aiResult;
    let isCached = false;

    if (cachedDoc) {
      aiResult = cachedDoc.result;
      isCached = true;
    } else {
      // Free -> Flash model; all paid plans (basic, pro, ultra, pro_weekly) -> Pro model
      const modelTier = plan.tier === "free" ? "free" : "pro";

      aiResult = await DetectionService.analyzeText(text, modelTier, language);

      if (typeof aiResult?.aiProbability !== "number") {
        throw new Error("AI Service returned invalid data structure");
      }
    }

    if (save === false) {
      return NextResponse.json({
        ...aiResult,
        documentId: null,
        cached: isCached,
      });
    }

    const generatedTitle =
      text
        .split(/\s+/)
        .slice(0, 6)
        .join(" ")
        .replace(/[^\w\s]/gi, "") + "...";

    const { data: doc, error: docError } = await supabase
      .from("documents")
      .insert({
        user_id: user.id,
        title: generatedTitle,
        original_content: text,
        humanized_content: null,
        tone_used: "analytical",
        language,
      })
      .select()
      .single();

    if (docError) throw new Error(`Database error: ${docError.message}`);

    const parallelTasks = [
      // Use service client to bypass RLS on the RPC call
      createServiceSupabaseClient().rpc("consume_plan_usage", {
        user_id_input: user.id,
        words_to_add: wordCount,
      }),
      supabase.from("detection_results").insert({
        document_id: doc.id,
        user_id: user.id,
        ai_score: aiResult.aiProbability / 100,
        details: {
          model: aiResult.modelUsed || "Gemini-Detector",
          word_count: wordCount,
          flagged_sentences_count: aiResult.flaggedSentences?.length || 0,
          tier_requested: plan.tier,
        },
      }),
    ];

    if (!isCached) {
      parallelTasks.push(
        supabase
          .from("detection_cache")
          .upsert({ hash: textHash, result: aiResult }),
      );
    }

    const taskResults = await Promise.all(parallelTasks);
    taskResults.forEach((res, idx) => {
      if (res.error) console.error(`Background Task ${idx} failed:`, res.error);
    });

    // Send notification email (fire-and-forget — never block the response)
    if (user.email) {
      const remaining = getRemainingWords(plan.tier, wordsUsed + wordCount);
      void sendDetectionEmail({
        to: user.email,
        name: profile?.full_name || user.email.split("@")[0] || "there",
        aiProbability: aiResult.aiProbability,
        wordCount,
        planName: plan.name,
        wordsRemaining: remaining,
        documentId: doc.id,
      }).catch((err) => console.error("[email] Detection email failed:", err));
    }

    return NextResponse.json({
      ...aiResult,
      documentId: doc.id,
      cached: isCached,
    });
  } catch (error: unknown) {
    const errorMessage =
      error instanceof Error ? error.message : "Internal Server Error";
    const errorStatus =
      typeof error === "object" &&
      error !== null &&
      "status" in error &&
      typeof (error as { status?: unknown }).status === "number"
        ? ((error as { status: number }).status as number)
        : undefined;

    console.error("DETECTION_API_CRASH:", errorMessage);

    const status = errorStatus === 503 ? 503 : 500;
    const message =
      status === 503
        ? "AI is currently busy. Try again in a few seconds."
        : errorMessage;

    return NextResponse.json({ error: message }, { status });
  }
}
