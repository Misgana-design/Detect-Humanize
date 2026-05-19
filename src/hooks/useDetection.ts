// src/hooks/useDetection.ts
import { useMutation } from "@tanstack/react-query";
import type { DetectionResult } from "@/services/ai/detectionService";
import { readJsonResponse } from "@/lib/http/apiClient";

export function useDetection() {
  return useMutation({
    mutationFn: async (
      text: string,
    ): Promise<DetectionResult & { cached: boolean }> => {
      const res = await fetch("/api/detect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text }),
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
