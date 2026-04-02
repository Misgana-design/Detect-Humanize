import { ai, humanizerSchema, MODEL_NAME } from "./geminiClient";

export type Tone = "casual" | "professional" | "academic";

export interface HumanizerResult {
  humanizedText: string;
  changes: string[];
}

export class HumanizerService {
  /**
   * Transforms AI-generated text into natural, human-like text based on a specific tone.
   */
  static async rewrite(text: string, tone: Tone): Promise<HumanizerResult> {
    const prompt = `
      You are an expert copywriter. Rewrite the following text to sound completely human-written.
      Remove common AI tropes (e.g., "In conclusion", "It is important to note", overly complex vocabulary).
      
      Target Tone: ${tone.toUpperCase()}
      
      Text to rewrite:
      "${text}"
    `;

    // 2026 STANDARD: Using the unified generateContent signature
    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: humanizerSchema,
        temperature: 0.7, // Higher temperature for more natural, varied phrasing
      },
    });

    if (!response.text) {
      throw new Error("Received an empty response from Gemini");
    }

    return JSON.parse(response.text) as HumanizerResult;
  }
}
