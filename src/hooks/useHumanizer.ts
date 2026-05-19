import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { HumanizerResult, Tone } from "@/services/ai/humanizerService";
import { readJsonResponse } from "@/lib/http/apiClient";

interface HumanizerPayload {
  text: string;
  tone: Tone;
  documentId?: string | null; // Add this!
}

export function useHumanizer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      text,
      tone,
      documentId, // Destructure it here
    }: HumanizerPayload): Promise<HumanizerResult & { cached?: boolean }> => {
      const res = await fetch("/api/humanize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Include documentId in the request body
        body: JSON.stringify({ text, tone, documentId }),
      });

      if (res.status === 401) {
        window.location.assign("/auth/signup");
        throw new Error("Please sign in to humanize text.");
      }

      return readJsonResponse<HumanizerResult & { cached?: boolean }>(
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
