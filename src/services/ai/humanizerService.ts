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
    
    Break the formal structure. Start sentences with 'And', 'But', or 'So'. Use at least two contractions per paragraph (e.g., 'don't' instead of 'do not'). Occasionally use a very short, 3-word sentence followed by a 25-word sentence to maximize 'burstiness'.

    Final Mission: Destroy the AI Fingerprint. 
    GPTZero and Originality.ai look for 'Perplexity' and 'Burstiness'. 
  
  You MUST apply these 2 "Messiness" rules:
  1. HIGH BURSTINESS: Avoid mid-length sentences (12-15 words) as they are the AI's "safe zone."
  2. HUMAN PERPLEXITY: Kill the "Look" and "Actually": Start the sentences directly. Instead of "Look, what's truly fascinating..." try "Faraday's early intuition is surprisingly resilient."

  3,Add a "glitch": Use a dash (—) or a semicolon to create a more complex, non-linear thought process.
  4, Use specific, non-obvious verbs: For example: Instead of "Lenz’s law handles the conceptual heavy lifting," try "Lenz's law does the grunt work of explaining that negative sign."
  5, Combine short, punchy sentences: Instead of "They just fail. We need computers," try "They fail so spectacularly that we’re forced to lean on numerical simulations."
  6, Use Active Voice: Use active voice over passive voice, which AI often prefers.
    
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
