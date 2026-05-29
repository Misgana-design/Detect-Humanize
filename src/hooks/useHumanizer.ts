import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { HumanizerResult, Tone } from "@/services/ai/humanizerService";
import { readJsonResponse } from "@/lib/http/apiClient";
import type { SupportedLanguage } from "@/lib/languages";

interface HumanizerPayload {
  text: string;
  tone: Tone;
  language?: SupportedLanguage;
  documentId?: string | null; // Add this!
}

export function useHumanizer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      text,
      tone,
      language,
      documentId,
    }: HumanizerPayload): Promise<HumanizerResult & { cached?: boolean; fallback?: boolean }> => {
      const res = await fetch("/api/humanize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, tone, language, documentId }),
      });

      if (res.status === 401) {
        window.location.assign("/auth/signup");
        throw new Error("Please sign in to humanize text.");
      }

      return readJsonResponse<HumanizerResult & { cached?: boolean; fallback?: boolean }>(
        res,
        "Failed to humanize text. Please try again.",
      );
    },
    // This is the "magic" part for your History page
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-history"] });
    },
  });
}
