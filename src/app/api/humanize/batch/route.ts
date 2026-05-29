/**
 * POST /api/humanize/batch
 *
 * Bulk humanization endpoint for the Ultra plan.
 * Accepts up to 10 texts in a single request and processes them
 * concurrently with per-item error isolation.
 *
 * Request body:
 *   { items: Array<{ text: string; tone?: Tone; id?: string }> }
 *
 * Response:
 *   { results: Array<{ id?: string; humanizedText: string; changes: string[]; cached: boolean } | { id?: string; error: string }> }
 */

import crypto from "crypto";
import { NextResponse } from "next/server";
import { getPlanDefinition } from "@/lib/billing/plans";
import { createServerSupabaseClient, createServiceSupabaseClient } from "@/lib/supabase/server";
import { HumanizerService, type Tone, type HumanizerTier } from "@/services/ai/humanizerService";
import { normalizeLanguage } from "@/lib/languages";

export const maxDuration = 60; // Vercel Pro allows up to 60s

const BATCH_LIMIT = 10;
const BULK_ELIGIBLE_TIERS = new Set(["ultra"]);
const VALID_TONES = new Set<Tone>([
  "casual",
  "professional",
  "academic",
  "formal",
  "creative",
  "friendly",
  "storytelling",
]);

interface BatchItem {
  id?: string;
  text: string;
  tone?: unknown;
  language?: unknown;
}

type BatchResultItem =
  | { id?: string; humanizedText: string; changes: string[]; cached: boolean }
  | { id?: string; error: string };

export async function POST(req: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Please sign in to use bulk humanization." },
        { status: 401 },
      );
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    const plan = getPlanDefinition(profile?.subscription_tier);

    // Only Ultra can use bulk processing
    if (!BULK_ELIGIBLE_TIERS.has(plan.tier)) {
      return NextResponse.json(
        {
          error: `Bulk processing requires the Ultra plan. You are on ${plan.name}.`,
        },
        { status: 403 },
      );
    }

    const body = (await req.json()) as { items?: BatchItem[] };
    const items = body.items;

    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "Request body must include a non-empty 'items' array." },
        { status: 400 },
      );
    }

    if (items.length > BATCH_LIMIT) {
      return NextResponse.json(
        { error: `Maximum ${BATCH_LIMIT} items per batch request.` },
        { status: 400 },
      );
    }

    // Validate each item
    for (const item of items) {
      if (!item.text || typeof item.text !== "string" || item.text.trim() === "") {
        return NextResponse.json(
          { error: "Each item must have a non-empty 'text' field." },
          { status: 400 },
        );
      }
      const wordCount = item.text.trim().split(/\s+/).length;
      if (plan.maxWordsPerInput !== null && wordCount > plan.maxWordsPerInput) {
        return NextResponse.json(
          {
            error: `Item "${item.id ?? item.text.slice(0, 30)}..." exceeds the ${plan.maxWordsPerInput.toLocaleString()} word limit for ${plan.name}.`,
          },
          { status: 403 },
        );
      }
    }

    const wordsUsed = profile?.words_used ?? 0;
    const totalWords = items.reduce(
      (sum, item) => sum + item.text.trim().split(/\s+/).length,
      0,
    );

    if (plan.wordQuota !== null && wordsUsed + totalWords > plan.wordQuota) {
      return NextResponse.json(
        {
          error: `This batch would exceed your ${plan.wordQuota.toLocaleString()} word quota for ${plan.name}.`,
        },
        { status: 402 },
      );
    }

    const humanizerTier: HumanizerTier = "pro"; // Ultra always uses the Pro pipeline

    // Process all items concurrently with per-item error isolation
    const results: BatchResultItem[] = await Promise.all(
      items.map(async (item): Promise<BatchResultItem> => {
        const tone: Tone =
          typeof item.tone === "string" && VALID_TONES.has(item.tone as Tone)
            ? (item.tone as Tone)
            : "casual";
        const language = normalizeLanguage(item.language);
        const cacheKey = crypto
          .createHash("sha256")
          .update(`${item.text.trim()}_${tone}_${language}`)
          .digest("hex");

        try {
          // Check cache first
          const { data: cachedResult } = await supabase
            .from("humanization_cache")
            .select("result")
            .eq("hash", cacheKey)
            .maybeSingle();

          if (cachedResult?.result) {
            const cached = cachedResult.result as { humanizedText: string; changes: string[] };
            return { id: item.id, ...cached, cached: true };
          }

          // Run humanizer
          const aiResult = await HumanizerService.rewrite(item.text, tone, humanizerTier, language);

          // Save to cache (fire-and-forget, don't block response)
          void supabase.from("humanization_cache").upsert({
            hash: cacheKey,
            result: aiResult,
          });

          // Save document
          const generatedTitle =
            item.text.split(/\s+/).slice(0, 6).join(" ").replace(/[^\w\s]/gi, "") + "...";

          void supabase.from("documents").insert({
            user_id: user.id,
            title: item.id ? `[Batch] ${item.id}` : generatedTitle,
            original_content: item.text,
            humanized_content: aiResult.humanizedText,
            tone_used: tone,
            language,
          });

          return { id: item.id, ...aiResult, cached: false };
        } catch (err) {
          const message = err instanceof Error ? err.message : "Processing failed.";
          console.error(`[batch-humanize] item ${item.id ?? "?"} failed:`, message);
          return { id: item.id, error: message };
        }
      }),
    );

    const serviceClient = createServiceSupabaseClient();
    const { error: usageError } = await serviceClient.rpc("consume_plan_usage", {
      user_id_input: user.id,
      words_to_add: totalWords,
    });
    if (usageError) throw usageError;

    const successCount = results.filter((r) => !("error" in r)).length;
    const errorCount = results.length - successCount;

    return NextResponse.json({
      results,
      meta: {
        total: items.length,
        succeeded: successCount,
        failed: errorCount,
        totalWordsProcessed: totalWords,
      },
    });
  } catch (error: unknown) {
    console.error("[batch-humanize] Unexpected error:", error);
    return NextResponse.json(
      { error: "Batch processing failed. Please try again." },
      { status: 500 },
    );
  }
}
