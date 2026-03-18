// src/services/ai/detectionService.ts
import { ai, detectionSchema, MODEL_NAME } from "./geminiClient";

export interface DetectionResult {
  aiProbability: number;
  confidence: "low" | "medium" | "high";
  flaggedSentences: string[];
  analysis: string;
}

export class DetectionService {
  private static readonly CHUNK_SIZE = 400;

  /**
   * Splits text into chunks, processes each concurrently, and aggregates results.
   */
  static async analyzeText(text: string): Promise<DetectionResult> {
    const words = text.split(/\s+/);
    const chunks: string[] = [];

    for (let i = 0; i < words.length; i += this.CHUNK_SIZE) {
      chunks.push(words.slice(i, i + this.CHUNK_SIZE).join(" "));
    }

    // Process all chunks concurrently for speed
    const chunkPromises = chunks.map((chunk) => this.analyzeChunk(chunk));
    const chunkResults = await Promise.all(chunkPromises);

    return this.aggregateResults(chunkResults);
  }

  private static async analyzeChunk(chunk: string): Promise<DetectionResult> {
    const prompt = `Analyze the following text for AI generation patterns. Focus on perplexity, burstiness, and common LLM transitions. Text to analyze: "${chunk}"`;

    // 2026 STANDARD: Using the new SDK's unified generateContent signature
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: detectionSchema,
        temperature: 0.1, // Low temperature for deterministic, analytical outputs
      },
    });

    if (!response.text) {
      throw new Error("Received an empty response from Gemini");
    }

    return JSON.parse(response.text) as DetectionResult;
  }

  /**
   * Mathematically and logically merges chunk results.
   */
  private static aggregateResults(results: DetectionResult[]): DetectionResult {
    if (results.length === 0) throw new Error("No results to aggregate");
    if (results.length === 1) return results[0];

    // Calculate mean probability: $P_{total} = \frac{1}{N} \sum_{i=1}^{N} P_i$
    const totalProbability = results.reduce(
      (acc, curr) => acc + curr.aiProbability,
      0,
    );
    const avgProbability = Math.round(totalProbability / results.length);

    // Flatten flagged sentences and remove duplicates
    const allFlagged = results.flatMap((r) => r.flaggedSentences);
    const uniqueFlagged = [...new Set(allFlagged)];

    // Determine aggregate confidence
    const confidences = results.map((r) => r.confidence);
    const confidence = confidences.includes("low")
      ? "low"
      : confidences.includes("medium")
        ? "medium"
        : "high";

    return {
      aiProbability: avgProbability,
      confidence,
      flaggedSentences: uniqueFlagged,
      analysis: `Aggregated analysis over ${results.length} text chunks. Average AI probability is ${avgProbability}%.`,
    };
  }
}
