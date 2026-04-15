import { client, humanizerSchema, MODELS } from "./geminiClient";

export type Tone = "casual" | "professional" | "academic";

export interface HumanizerResult {
  humanizedText: string;
  changes: string[];
}

export class HumanizerService {
  /**
   * Transforms AI-generated text into natural, human-like text using a 3-stage pipeline.
   */
  static async rewrite(text: string, tone: Tone): Promise<HumanizerResult> {
    // ==========================================
    // STAGE 1: Analysis (Detection + Breakdown)
    // Low temperature for strictly analytical insight
    // ==========================================
    const analysisPrompt = `Analyze the following text and identify:
    - AI-like patterns
    - unnatural phrasing
    - repetitive structure
    - tone issues

    Text:
    """${text}"""`;

    const analysisResponse = await client.models.generateContent({
      model: MODELS.PRO,
      contents: analysisPrompt,
      config: {
        temperature: 0.2, // Keep it cold and logical
      },
    });

    const analysis =
      analysisResponse.text || "No specific weaknesses identified.";

    // ==========================================
    // STAGE 2: Rewrite (The Core)
    // Medium temperature to balance structure and flow
    // ==========================================
    const rewritePrompt = `Rewrite the following text to sound natural and human-like.
    Target Tone: ${tone.toUpperCase()}
    
    Address these specific weaknesses identified in the original text:
    ${analysis}

    Rules:
    - vary sentence length
    - add slight imperfections
    - use conversational tone
    - avoid robotic phrasing
    - keep original meaning

    Text:
    """${text}"""`;

    const rewriteResponse = await client.models.generateContent({
      model: MODELS.PRO,
      contents: rewritePrompt,
      config: {
        temperature: 0.7, // Standard creative variation
      },
    });

    const rewrittenText = rewriteResponse.text || text;

    // ==========================================
    // STAGE 3: Humanization Enhancer (Secret Sauce)
    // High temperature for human-like randomness and final JSON mapping
    // ==========================================
    const polishPrompt = `Improve the following rewritten text further by:
    - adding natural flow
    - introducing slight randomness
    - making it sound completely like a real person wrote it in a ${tone} tone.
    
    Keep it strictly undetectable as AI-generated.
    
    Text:
    """${rewrittenText}"""
    
    Format the output to include the final humanized text and a brief array of the structural changes made.`;

    const finalResponse = await client.models.generateContent({
      model: MODELS.PRO,
      contents: polishPrompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: humanizerSchema,
        temperature: 0.9, // High variance for that final human imperfection
      },
    });

    if (!finalResponse.text) {
      throw new Error(
        "Received an empty response from Gemini during final polish",
      );
    }

    return JSON.parse(finalResponse.text) as HumanizerResult;
  }
}
