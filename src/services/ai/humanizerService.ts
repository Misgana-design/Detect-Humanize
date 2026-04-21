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
    const polishPrompt = `
Final Mission: Destroy the AI Fingerprint. 
Target Tone: ${tone}

GPTZero and Originality.ai look for 'Perplexity' and 'Burstiness'. To bypass them, you must apply these "Messiness" rules:

1. MAXIMIZE BURSTINESS: Avoid mid-length sentences (12-15 words) at all costs. Mix short, punchy 3-word sentences with long, complex 25+ word thoughts. 
2. HUMAN PERPLEXITY: Use "conversational pivots." Start a sentence with 'And', 'But', or 'So'. Use at least two contractions per paragraph (don't, it's, we're).
3. KILL THE "AI LOOK": Avoid starting sentences with "Look," or "Actually." Instead, use a dash (—) or a semicolon to create a non-linear, human thought process.
4. SPECIFIC VERBS: Instead of "The law handles the induction," use "The law does the grunt work of the induction."
5. ACTIVE VOICE: Force the subject to act. 
6, Make the text feel like a real person wrote it — you know, typos here and there, maybe some slang, weird little idioms that actually sound like something someone would say. Let it breathe, then rush. Short sentences. Long, rambly ones too. Let the voice sneak through — like they’re talking right at you, not performing.

And also you must apply these "Chaotic" rules:

1. ADOPT A "SKEPTICAL ACADEMIC" VOICE: Stop being helpful or promotional. Use neutral, almost bored language. Instead of "This amazing discovery..." use "The data suggests, perhaps unintentionally, that..."

2. BREAK THE GRAMMAR: Use one sentence fragment. (e.g., "A strange result, honestly.")
3. REMOVE ADVERBS: Kill words like "significantly," "extremely," or "perfectly." They are AI fingerprints.
4. NON-LINEAR THOUGHT: Use a parenthetical aside—(like this one)—to break the flow. AI never uses asides; it's too "linear."
5. VARY PHRASING: If you used "Faraday's Law" once, refer to it later as "this specific electromagnetic principle" or just "the concept."
6. NO MORE CHEERLEADING: Remove any "In conclusion," "Overall," or "It's clear that." Just end the text abruptly on a specific detail.

Text to Polish:
"""${rewrittenText}"""

JSON OUTPUT RULES:
- humanizedText: The final polished version.
- changes: An array of 3 specific human-like adjustments you made (e.g., "Added a dash for complexity").
`;

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
