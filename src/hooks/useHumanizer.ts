import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { HumanizerResult, Tone } from "@/services/ai/humanizerService";
import { readJsonResponse, readNdjsonRecords } from "@/lib/http/apiClient";
import type { SupportedLanguage } from "@/lib/languages";

export type DetectorTarget = "other";

interface HumanizerPayload {
  text: string;
  tone: Tone;
  language?: SupportedLanguage;
  documentId?: string | null;
  detectorTarget?: DetectorTarget;
}

type HumanizerMutationResult = HumanizerResult & { cached?: boolean };

/**
 * Consumes the NDJSON stream from /api/humanize:
 * - "chunk" records accumulate into `text` and are reported via `onPartial`
 *   so the UI can render progressively;
 * - the "done" record carries the authoritative final result;
 * - an "error" record (or a stream that ends early) rejects.
 */
export async function consumeHumanizerStream(
  response: Response,
  onPartial: (text: string) => void,
): Promise<HumanizerMutationResult> {
  let text = "";
  let final: HumanizerMutationResult | null = null;
  let failure: Error | null = null;

  for await (const record of readNdjsonRecords(response)) {
    if (record.type === "chunk" && typeof record.text === "string") {
      text += record.text;
      onPartial(text);
    } else if (record.type === "done") {
      const humanizedText =
        typeof record.humanizedText === "string"
          ? record.humanizedText
          : text;
      final = {
        humanizedText,
        changes: Array.isArray(record.changes)
          ? record.changes.filter((c): c is string => typeof c === "string")
          : [],
        cached: Boolean(record.cached),
      };
      // The server's final text is authoritative (guards against any chunk
      // that was skipped or dropped in transit).
      onPartial(final.humanizedText);
    } else if (record.type === "error") {
      failure = new Error(
        typeof record.message === "string" && record.message.trim()
          ? record.message
          : "Failed to humanize text. Please try again.",
      );
    }
  }

  if (failure) throw failure;
  if (!final) {
    throw new Error(
      "The connection ended before the humanized text was complete. Please try again.",
    );
  }
  return final;
}

export function useHumanizer() {
  const queryClient = useQueryClient();
  // Progressive output of the in-flight run — cleared when a new run starts
  // and when a run fails, so the panel falls back to its empty state.
  const [streamedText, setStreamedText] = useState("");

  const mutation = useMutation({
    onMutate: () => {
      setStreamedText("");
    },
    mutationFn: async ({
      text,
      tone,
      language,
      documentId,
      detectorTarget = "other",
    }: HumanizerPayload): Promise<HumanizerMutationResult> => {
      const res = await fetch("/api/humanize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, tone, language, documentId, detectorTarget }),
      });

      if (res.status === 401) {
        window.location.assign("/auth/signup");
        throw new Error("Please sign in to humanize text.");
      }

      const contentType = res.headers.get("content-type") ?? "";
      const isStream = res.ok && contentType.includes("application/x-ndjson");

      if (!isStream) {
        // Pre-flight failures (400/402/403) and any non-streaming response.
        try {
          return await readJsonResponse<HumanizerMutationResult>(
            res,
            "Failed to humanize text. Please try again.",
          );
        } catch (error) {
          // Surface the HTTP status (e.g. 402 → quota exceeded) so the UI can
          // render the proper upgrade / buy-credits block.
          if (error instanceof Error) {
            Object.assign(error, { status: res.status });
          }
          setStreamedText("");
          throw error;
        }
      }

      try {
        return await consumeHumanizerStream(res, setStreamedText);
      } catch (error) {
        setStreamedText("");
        throw error;
      }
    },
    // This is the "magic" part for your History page
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-history"] });
    },
  });

  return { ...mutation, streamedText };
}
