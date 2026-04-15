import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { HumanizerService, Tone } from "@/services/ai/humanizerService";
import crypto from "crypto";

export const maxDuration = 30;

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

    // 👉 THE FIX: Accept an optional documentId from the frontend
    const documentId: string | undefined = body.documentId;

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
    const cacheKey = crypto
      .createHash("sha256")
      .update(`${text.trim()}_${tone}`)
      .digest("hex");

    const { data: cachedResult } = await supabase
      .from("humanization_cache")
      .select("result")
      .eq("hash", cacheKey)
      .maybeSingle(); // Changed to maybeSingle to prevent throwing errors on miss

    let aiResult;
    let isCached = false;

    if (cachedResult) {
      aiResult = cachedResult.result;
      isCached = true;
    } else {
      // 3. EXECUTE AI SERVICE (Only if it wasn't in the cache)
      aiResult = await HumanizerService.rewrite(text, tone);
    }

    // 4. PERSISTENCE
    // We explicitly type this as Promise<any>[]
    const parallelTasks: Promise<any>[] = [
      // Wrapping in an async arrow function ensures a native Promise return
      (async () => {
        const { error } = await supabase.rpc("increment_api_usage", {
          user_id_input: user.id,
        });
        if (error) throw error;
      })(),
    ];

    // Cache the result if this was a fresh Gemini run
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

    // Conditionally either update the existing scan OR insert a new file
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

    return NextResponse.json({ ...aiResult, cached: isCached });
  } catch (error: any) {
    console.error("Humanizer API Error:", error);
    return NextResponse.json(
      { error: "Failed to process text" },
      { status: 500 },
    );
  }
}
