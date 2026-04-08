// src/hooks/useDetection.ts
import { useMutation } from "@tanstack/react-query";
import type { DetectionResult } from "@/services/ai/detectionService";

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

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Detection failed");
      }
      return res.json();
    },
  });
}
