import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { HumanizerResult, Tone } from "@/services/ai/humanizerService";

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

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to humanize text");
      }
      return res.json();
    },
    // This is the "magic" part for your History page
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-history"] });
    },
  });
}
