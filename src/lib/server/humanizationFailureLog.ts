import { createServiceSupabaseClient } from "@/lib/supabase/server";

export type HumanizationFailureRecord = {
  userId?: string | null;
  /** Which endpoint failed. Defaults to "humanize". */
  source?: "humanize" | "batch";
  message: string;
  status?: number | null;
  wordCount?: number | null;
  detectorTarget?: string | null;
};

/**
 * Best-effort write to the humanization_failures table so failed requests
 * (AI errors, timeouts, crashes) are queryable in SQL instead of living only
 * in short-lived server logs.
 *
 * Never throws and never blocks the response: failure logging that breaks the
 * request would itself become a new failure mode.
 */
export async function logHumanizationFailure(
  record: HumanizationFailureRecord,
): Promise<void> {
  try {
    const serviceClient = createServiceSupabaseClient();
    const { error } = await serviceClient.from("humanization_failures").insert({
      user_id: record.userId ?? null,
      source: record.source ?? "humanize",
      error_message: record.message.slice(0, 2000),
      status_code: record.status ?? null,
      word_count: record.wordCount ?? null,
      detector_target: record.detectorTarget ?? null,
    });
    if (error) {
      console.error("[humanization-failures] log insert failed:", error.message);
    }
  } catch (err) {
    console.error("[humanization-failures] log insert failed:", err);
  }
}
