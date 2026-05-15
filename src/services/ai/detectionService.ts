import { client, detectionSchema, MODELS } from "./geminiClient";

export interface DetectionResult {
  aiProbability: number;
  confidence: "low" | "medium" | "high";
  flaggedSentences: string[];
  analysis: string;
  cached?: boolean;
  documentId?: string;
  modelUsed?: string;
}

export class DetectionService {
  private static readonly CHUNK_SIZE = 200;

  static async analyzeText(
    text: string,
    userTier: string = "free",
  ): Promise<DetectionResult> {
    // === 3B: Empty text guard ===
    if (!text?.trim()) {
      return {
        aiProbability: 0,
        confidence: "low",
        flaggedSentences: [],
        analysis: "Empty or whitespace-only input",
        modelUsed: userTier === "pro" ? MODELS.PRO : MODELS.FREE,
      };
    }

    const words = text.split(/\s+/);
    const chunks: string[] = [];

    for (let i = 0; i < words.length; i += this.CHUNK_SIZE) {
      chunks.push(words.slice(i, i + this.CHUNK_SIZE).join(" "));
    }

    const chunkPromises = chunks.map((chunk) =>
      this.analyzeChunk(chunk, userTier),
    );
    const chunkResults = await Promise.all(chunkPromises);

    const aggregated = this.aggregateResults(chunkResults);

    return {
      ...aggregated,
      modelUsed: userTier === "pro" ? MODELS.PRO : MODELS.FREE,
    };
  }

  private static async analyzeChunk(
    chunk: string,
    userTier: string,
    attempt = 1,
  ): Promise<DetectionResult> {
    const modelName = userTier === "pro" ? MODELS.PRO : MODELS.FREE;

    try {
      const response = await client.models.generateContent({
        model: modelName,
        contents: [
          {
            role: "user",
            parts: [{ text: `Analyze this text for AI markers: "${chunk}"` }],
          },
        ],
        config: {
          systemInstruction: `You are a Linguistic Forensic Expert.
          Your goal is to distinguish between genuine human writing and AI-generated text.

          SCORING RUBRIC (0-100% AI probability):
          - 0-25%: Clear human traits — typos, slang, unique idioms, natural burstiness, varying sentence rhythm, personal voice.
          - 25-60%: Heavily edited or formal human text, but still shows some human variance.
          - 60-100%: Overly polished, repetitive rhythm, excessive transitional phrases (Moreover, Furthermore, In conclusion), lacks personal perspective or emotional tone.

          IMPORTANT GUIDANCE:
          - If the text appears deliberately humanized (intentional minor imperfections, manually added variance, or edited to sound more natural), be more lenient — lower the score.
          - Only give >80% if the text is suspiciously perfect AND lacks any human markers.
          - Be accurate, not overly punitive.`,

          responseMimeType: "application/json",
          responseJsonSchema: detectionSchema,
          temperature: 0.1,

          // FEATURE: Enable 'Thinking' for Gemini 3 to improve detection depth
          ...(modelName.includes("gemini-3") && {
            thinkingConfig: { includeThoughts: true },
          }),
        },
      });

      const rawText =
        response.text ?? response.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) throw new Error("No text returned");

      // === 3A: Safer JSON extraction (handles thinking + markdown fences) ===
      let cleanedJson = rawText.trim();

      // Remove possible markdown code fences that Gemini sometimes adds
      if (cleanedJson.startsWith("```json")) {
        cleanedJson = cleanedJson
          .replace(/^```json\s*/, "")
          .replace(/\s*```$/, "");
      } else if (cleanedJson.startsWith("```")) {
        cleanedJson = cleanedJson.replace(/^```\s*/, "").replace(/\s*```$/, "");
      }

      // Fallback regex (still useful in rare cases)
      const match = cleanedJson.match(/\{[\s\S]*\}/);
      if (match) cleanedJson = match[0];

      const result = JSON.parse(cleanedJson) as DetectionResult;

      console.log(
        `[${modelName}] AI Score: ${result.aiProbability}% | Confidence: ${result.confidence}`,
      );
      return result;
    } catch (error: unknown) {
      const status =
        typeof error === "object" &&
        error !== null &&
        "status" in error &&
        typeof (error as { status?: unknown }).status === "number"
          ? (error as { status: number }).status
          : undefined;
      const isOverloaded = status === 503 || status === 429;

      if (isOverloaded && attempt <= 2) {
        console.warn(
          `Vertex ${modelName} busy, retrying chunk (Attempt ${attempt})...`,
        );
        await new Promise((r) => setTimeout(r, attempt * 1000));
        return this.analyzeChunk(chunk, userTier, attempt + 1);
      }

      if (userTier === "pro" && attempt === 3) {
        console.warn(`Pro model failed 3 times. Falling back to Flash...`);
        return this.analyzeChunk(chunk, "free", 4);
      }

      throw error;
    }
  }

  private static aggregateResults(results: DetectionResult[]): DetectionResult {
    if (results.length === 0) throw new Error("No results to aggregate");
    if (results.length === 1) return results[0];

    // Find the chunk with the highest AI probability (most suspicious part)
    const maxIndex = results.reduce(
      (maxIdx, result, idx) =>
        result.aiProbability > results[maxIdx].aiProbability ? idx : maxIdx,
      0,
    );

    const maxResult = results[maxIndex];
    const maxProbability = maxResult.aiProbability;

    const allFlagged = results.flatMap((r) => r.flaggedSentences);
    const uniqueFlagged = [...new Set(allFlagged)];

    const confidences = results.map((r) => r.confidence);
    const confidence = confidences.includes("high")
      ? "high"
      : confidences.includes("medium")
        ? "medium"
        : "low";

    return {
      aiProbability: maxProbability,
      confidence,
      flaggedSentences: uniqueFlagged,
      // === Keep the richest analysis from the most suspicious chunk ===
      analysis:
        `Analysis completed over ${results.length} chunks.\n\n` +
        `Most suspicious chunk (score ${maxProbability}%):\n` +
        maxResult.analysis,
    };
  }
}
