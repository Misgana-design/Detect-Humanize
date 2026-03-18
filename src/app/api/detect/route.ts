// src/app/api/detect/route.ts
import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { DetectionService } from "@/services/ai/detectionService";
import crypto from "crypto";

const RATE_LIMITS = {
  free: 10,
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
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { text } = await req.json();
    if (!text || text.split(" ").length < 50) {
      return NextResponse.json(
        { error: "Text must be at least 50 words." },
        { status: 400 },
      );
    }

    // 1. RATE LIMITING CHECK
    const { data: profile } = await supabase
      .from("profiles")
      .select("api_usage_count, subscription_tier")
      .eq("id", user.id)
      .single();

    const tier =
      (profile?.subscription_tier as keyof typeof RATE_LIMITS) || "free";
    const limit = RATE_LIMITS[tier];

    if (profile && profile.api_usage_count >= limit) {
      return NextResponse.json(
        { error: "Usage limit reached. Please upgrade via Polar." },
        { status: 402 },
      );
    }

    // 2. CACHE CHECK (Hashing)
    // ARCHITECTURE DECISION: Hash the text to create a deterministic ID.
    // If a user scans the same essay twice, we fetch from Supabase instead of billing Gemini.
    const textHash = crypto
      .createHash("sha256")
      .update(text.trim())
      .digest("hex");

    const { data: cachedDoc } = await supabase
      .from("detection_cache")
      .select("result")
      .eq("hash", textHash)
      .single();

    if (cachedDoc) {
      return NextResponse.json({ ...cachedDoc.result, cached: true });
    }

    // 3. RUN AI DETECTION
    const aiResult = await DetectionService.analyzeText(text);

    // 4. SAVE TO CACHE & INCREMENT USAGE (Run in parallel for speed)
    await Promise.all([
      supabase
        .from("detection_cache")
        .upsert({ hash: textHash, result: aiResult }),
      supabase.rpc("increment_api_usage", { user_id_input: user.id }), // Requires a Supabase RPC function
      supabase
        .from("documents")
        .insert({
          user_id: user.id,
          content: text,
          ai_score: aiResult.aiProbability,
        }),
    ]);

    return NextResponse.json({ ...aiResult, cached: false });
  } catch (error: any) {
    console.error("Detection Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
