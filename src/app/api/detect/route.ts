import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { DetectionService } from "@/services/ai/detectionService";
import crypto from "crypto";

const RATE_LIMITS = {
  free: 1000,
  pro: 1000,
  enterprise: 10000,
};

export async function POST(req: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user)
      return NextResponse.json({ error: "Please sign in to use detector" }, { status: 401 });

    const { text } = await req.json();
    if (!text || text.split(/\s+/).length < 50) {
      return NextResponse.json(
        { error: "Text must be at least 50 words." },
        { status: 400 },
      );
    }

    // 1. RATE LIMIT & TIER CHECK
    const { data: profile } = await supabase
      .from("profiles")
      .select("api_usage_count, subscription_tier")
      .eq("id", user.id)
      .maybeSingle();

    const tier =
      (profile?.subscription_tier as keyof typeof RATE_LIMITS) || "free";
    const limit = RATE_LIMITS[tier];

    if (profile && profile.api_usage_count >= limit) {
      return NextResponse.json(
        { error: "Usage limit reached." },
        { status: 402 },
      );
    }

    // 2. CACHE CHECK
    const textHash = crypto
      .createHash("sha256")
      .update(text.trim())
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
      // 🔥 ARCHITECTURAL UPDATE: Pass the 'tier' to the service
      aiResult = await DetectionService.analyzeText(text, tier);

      if (typeof aiResult?.aiProbability !== "number") {
        throw new Error("AI Service returned invalid data structure");
      }
    }

    // 3. SAVE DOCUMENT
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
      })
      .select()
      .single();

    if (docError) throw new Error(`Database error: ${docError.message}`);

    // 4. PARALLEL BACKGROUND TASKS
    const parallelTasks = [
      supabase.rpc("increment_api_usage", { user_id_input: user.id }),
      supabase.from("detection_results").insert({
        document_id: doc.id,
        user_id: user.id,
        ai_score: aiResult.aiProbability / 100,
        details: {
          // 🔥 USE THE MODEL ACTUALLY RETURNED (Pro vs Flash)
          model: aiResult.modelUsed || "Gemini-Detector",
          word_count: text.split(/\s+/).length,
          flagged_sentences_count: aiResult.flaggedSentences?.length || 0,
          tier_requested: tier,
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

    return NextResponse.json({
      ...aiResult,
      documentId: doc.id,
      cached: isCached,
    });
  } catch (error: any) {
    console.error("DETECTION_API_CRASH:", error.message || error);

    // Catch 503 "High Demand" errors if they slip past the service's retry logic
    const status = error.status === 503 ? 503 : 500;
    const message =
      status === 503
        ? "AI is currently busy. Try again in a few seconds."
        : error.message || "Internal Server Error";

    return NextResponse.json({ error: message }, { status });
  }
}
