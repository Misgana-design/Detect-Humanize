// 1. Fixed Import: Use GoogleGenAI instead of Client
import { GoogleGenAI } from "@google/genai";

// Initialize the Unified Client
// The SDK automatically uses your gcp-key.json via GOOGLE_APPLICATION_CREDENTIALS
const client = new GoogleGenAI({
  project: process.env.GCP_PROJECT_ID!,
  location: "global",
  vertexai: true, // Ensures usage of Vertex AI and your $300 credits
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

  // 2026 Model IDs - Use '-preview' to avoid 404 errors in Vertex AI Garden
  private static readonly MODELS = {
    FREE: "gemini-3-flash-preview",
    PRO: "gemini-3.1-pro-preview",
  };

  private static readonly detectionSchema = {
    type: "OBJECT",
    properties: {
      analysis: {
        type: "STRING",
        description:
          "Detailed linguistic forensic analysis identifying specific AI markers vs human variance.",
      },
      flaggedSentences: {
        type: "ARRAY",
        items: { type: "STRING" },
      },
      confidence: { type: "STRING", enum: ["low", "medium", "high"] },
      aiProbability: {
        type: "NUMBER",
        description:
          "0-100 score. Be aggressive: if the text is overly polished or lacks 'burstiness', it is likely AI.",
      },
    },
    required: ["analysis", "flaggedSentences", "confidence", "aiProbability"],
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
      modelUsed: userTier === "pro" ? this.MODELS.PRO : this.MODELS.FREE,
    };
  }

  private static async analyzeChunk(
    chunk: string,
    userTier: string,
    attempt = 1,
  ): Promise<DetectionResult> {
    const modelName = userTier === "pro" ? this.MODELS.PRO : this.MODELS.FREE;

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
          // FIX 1: Move systemInstruction HERE
          systemInstruction: `You are a Linguistic Forensic Expert. 
          Your goal is to distinguish between 'Human Messiness' and 'AI Polishing'.
          
          SCORING RUBRIC:
          - 0-20%: Text has typos, slang, unique idioms, or varying sentence lengths.
          - 20-60%: Likely human but heavily edited or formal.
          - 60-100%: Text is perfectly structured, uses "Moreover/Furthermore/In conclusion" excessively, and lacks personal perspective.
          
          Be aggressive. If the text reads like an LLM (smooth, repetitive rhythm), the score must be > 80%.`,

          responseMimeType: "application/json",
          responseSchema: this.detectionSchema,
          temperature: 0.1,

          // FEATURE: Enable 'Thinking' for Gemini 3 to improve detection depth
          // This allows the model to "reason" internally before giving the JSON
          ...(modelName.includes("gemini-3") && {
            thinkingConfig: { includeThoughts: true },
          }),
        },
      });

      const rawText = response.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) throw new Error("No text returned");

      const result = JSON.parse(rawText) as DetectionResult;

      console.log(
        `[${modelName}] AI Score: ${result.aiProbability}% | Confidence: ${result.confidence}`,
      );
      return result;
    } catch (error: any) {
      const isOverloaded = error.status === 503 || error.status === 429;

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

    // 1. SWITCHED: Use Math.max instead of a standard average
    // This highlights the "most suspicious" part of the text.
    const maxProbability = Math.max(...results.map((r) => r.aiProbability));

    const allFlagged = results.flatMap((r) => r.flaggedSentences);
    const uniqueFlagged = [...new Set(allFlagged)];

    // 2. Logic for Confidence: If the max score is high, confidence should be too.
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
      // 3. Updated analysis text to reflect the peak probability
      analysis: `Analysis completed over ${results.length} text chunks. The highest AI signal detected was ${maxProbability}%.`,
    };
  }
}
