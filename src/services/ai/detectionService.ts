import { VertexAI, SchemaType } from "@google-cloud/vertexai";

// 1. Initialize Vertex AI
const vertex_ai = new VertexAI({
  project: process.env.GCP_PROJECT_ID!,
  location: "us-central1",
});

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
  private static readonly CHUNK_SIZE = 400;

  // UPDATED: Using the 2026 model IDs found in your Model Garden screenshot
  private static readonly MODELS = {
    FREE: "gemini-3-flash-preview",
    PRO: "gemini-3.1-pro-preview",
  };

  private static readonly detectionSchema = {
    type: SchemaType.OBJECT,
    properties: {
      aiProbability: { type: SchemaType.NUMBER },
      confidence: { type: SchemaType.STRING, enum: ["low", "medium", "high"] },
      flaggedSentences: {
        type: SchemaType.ARRAY,
        items: { type: SchemaType.STRING },
      },
      analysis: { type: SchemaType.STRING },
    },
    required: ["aiProbability", "confidence", "flaggedSentences", "analysis"],
  };

  static async analyzeText(
    text: string,
    userTier: string = "free",
  ): Promise<DetectionResult> {
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
      // Logic update: Ensure the returned metadata reflects the 2026 models
      modelUsed: userTier === "pro" ? this.MODELS.PRO : this.MODELS.FREE,
    };
  }

  private static async analyzeChunk(
    chunk: string,
    userTier: string,
    attempt = 1,
  ): Promise<DetectionResult> {
    // UPDATED: Use the new Gemini 3 model names
    const modelName = userTier === "pro" ? this.MODELS.PRO : this.MODELS.FREE;

    const model = vertex_ai.getGenerativeModel({
      model: modelName,
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: this.detectionSchema,
        temperature: 0.1,
      },
    });

    try {
      const prompt = `Analyze the following text for AI generation patterns. Focus on perplexity, burstiness, and common LLM transitions. Text: "${chunk}"`;

      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
      });

      const response = await result.response;
      const rawText = response.candidates![0].content.parts[0].text;

      if (!rawText) throw new Error("Empty response from Vertex AI");

      return JSON.parse(rawText as string) as DetectionResult;
    } catch (error: any) {
      const isOverloaded = error.status === 503 || error.status === 429;

      if (isOverloaded && attempt <= 2) {
        console.warn(`Vertex ${modelName} busy, retrying chunk...`);
        await new Promise((r) => setTimeout(r, attempt * 1000));
        return this.analyzeChunk(chunk, userTier, attempt + 1);
      }

      // If Pro fails 3 times, we drop to Flash (Free) to ensure service stays up
      if (userTier === "pro" && attempt === 3) {
        return this.analyzeChunk(chunk, "free", 4);
      }

      throw error;
    }
  }

  private static aggregateResults(results: DetectionResult[]): DetectionResult {
    if (results.length === 0) throw new Error("No results to aggregate");
    if (results.length === 1) return results[0];

    const totalProbability = results.reduce(
      (acc, curr) => acc + curr.aiProbability,
      0,
    );
    const avgProbability = Math.round(totalProbability / results.length);

    const allFlagged = results.flatMap((r) => r.flaggedSentences);
    const uniqueFlagged = [...new Set(allFlagged)];

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
