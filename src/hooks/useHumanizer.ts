import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { HumanizerResult, Tone } from "@/services/ai/humanizerService";
import { readJsonResponse } from "@/lib/http/apiClient";
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
 * Consumes the Vercel AI SDK text stream from /api/humanize.
 *
 * toTextStreamResponse() returns a plain text body — the response is just
 * the raw model output chunk by chunk, with no protocol overhead.  The
 * client reads it with a standard ReadableStream reader and accumulates
 * the text, reporting each update via onPartial for progressive rendering.
 */
async function consumeTextStream(
  response: Response,
  onPartial: (text: string) => void,
): Promise<HumanizerMutationResult> {
  if (!response.body) {
    throw new Error("The server returned an empty response. Please try again.");
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let text = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    text += decoder.decode(value, { stream: true });
    onPartial(text);
  }

  // Flush any remaining buffered data.
  text += decoder.decode();

  if (!text.trim()) {
    throw new Error(
      "The connection ended before the humanized text was complete. Please try again.",
    );
  }

  return { humanizedText: text, changes: [], cached: false };
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
      const isDataStream =
        res.ok && (contentType.includes("text/plain") || contentType.includes("x-ndjson"));

      if (!isDataStream) {
        // Pre-flight failures (400/402/403) and cache-hit responses return JSON.
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
        return await consumeTextStream(res, setStreamedText);
      } catch (error) {
        setStreamedText("");
        throw error;
      }
    },
    // Invalidate the history query so the History page shows the new entry.
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-history"] });
    },
  });

  return { ...mutation, streamedText };
}
