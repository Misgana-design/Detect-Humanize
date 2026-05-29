// src/hooks/useDetection.ts
import { useMutation } from "@tanstack/react-query";
import type { DetectionResult } from "@/services/ai/detectionService";
import { readJsonResponse } from "@/lib/http/apiClient";
import type { SupportedLanguage } from "@/lib/languages";

type DetectionPayload = {
  text: string;
  language?: SupportedLanguage;
  save?: boolean;
};

export function useDetection() {
  return useMutation({
    mutationFn: async (
      payload: string | DetectionPayload,
    ): Promise<DetectionResult & { cached: boolean }> => {
      const body =
        typeof payload === "string"
          ? { text: payload }
          : payload;
      const res = await fetch("/api/detect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (res.status === 401) {
        window.location.assign("/auth/signup");
        throw new Error("Please sign in to use detector.");
      }

      return readJsonResponse<DetectionResult & { cached: boolean }>(
        res,
        "Detection failed. Please try again.",
      );
    },
  });
}
