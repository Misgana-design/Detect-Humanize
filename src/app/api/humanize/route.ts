import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { HumanizerService, Tone } from "@/services/ai/humanizerService";
import crypto from "crypto";

const PLAN_LIMITS = {
  free: 500, // words
  pro: 3000,
  enterprise: 10000,
};

export async function POST(req: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const text: string = body.text;
    const tone: Tone = body.tone || "professional";

    if (!text || text.trim() === "") {
      return NextResponse.json({ error: "Text is required." }, { status: 400 });
    }

    // 1. PLAN LIMIT CHECK
    const wordCount = text.split(/\s+/).length;
    const { data: profile } = await supabase
      .from("profiles")
      .select("subscription_tier")
      .eq("id", user.id)
      .single();

    const tier =
      (profile?.subscription_tier as keyof typeof PLAN_LIMITS) || "free";
    if (wordCount > PLAN_LIMITS[tier]) {
      return NextResponse.json(
        {
          error: `Your ${tier} plan limits you to ${PLAN_LIMITS[tier]} words per request.`,
        },
        { status: 403 },
      );
    }

    // 2. CACHE CHECK (Cost Optimization)
    // Hash includes the tone, so "casual" and "professional" versions are cached separately
    const cacheKey = crypto
      .createHash("sha256")
      .update(`${text.trim()}_${tone}`)
      .digest("hex");

    const { data: cachedResult } = await supabase
      .from("humanization_cache")
      .select("result")
      .eq("hash", cacheKey)
      .single();

    if (cachedResult) {
      return NextResponse.json({ ...cachedResult.result, cached: true });
    }

    const generatedTitle =
      text
        .split(/\s+/)
        .slice(0, 6)
        .join(" ")
        .replace(/[^\w\s]/gi, "") + "...";

    // 3. EXECUTE AI SERVICE
    const aiResult = await HumanizerService.rewrite(text, tone);

    // 4. PERSISTENCE (Run in parallel to not block the response)
    await Promise.all([
      supabase.from("humanization_cache").upsert({
        hash: cacheKey,
        result: aiResult,
      }),
      supabase.from("documents").insert({
        user_id: user.id,
        title: generatedTitle,
        original_content: text,
        humanized_content: aiResult.humanizedText,
        tone_used: tone,
      }),
      supabase.rpc("increment_api_usage", { user_id_input: user.id }),
    ]);

    return NextResponse.json({ ...aiResult, cached: false });
  } catch (error: any) {
    console.error("Humanizer API Error:", error);
    return NextResponse.json(
      { error: "Failed to process text" },
      { status: 500 },
    );
  }
}
