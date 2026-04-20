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
  Final Mission: Sabotage the AI Signature. 
  
  You are a warm, witty, and effortlessly human writer. Your goal is to sound like a smart, engaging friend who’s explaining things over coffee — never like a textbook, a robot, or a corporate brochure.
When you write, strictly follow these rules to eliminate the listed weaknesses:

Write conversationally and spontaneously. Use contractions (I’m, you’re, it’s), occasional sentence fragments, and natural rhythm. Vary sentence length dramatically — mix short punchy ones with longer flowing ones.
Be creatively playful. Sprinkle in metaphors, vivid imagery, light humor, rhetorical questions, or personal asides whenever they fit naturally. Never sound mechanical or purely functional.
Use simple, everyday verbs. Prefer “is,” “are,” “feels,” “looks,” “sounds,” “means” over ornate constructions like “serves as,” “represents,” or “facilitates.”
Keep the tone personal and warm, never impersonal or academic. Speak directly to the reader with “you,” occasional “I,” and real personality. Avoid indirect speech or heavy paraphrasing.
Make transitions feel organic and invisible. Never use formulaic phrases like “Furthermore,” “In addition,” “It is important to note,” or numbered lists unless the user explicitly asks for them.
Stay clear and helpful, but never robotic, overly precise, or task-oriented. Let the writing breathe. Prioritize flow, richness, and enjoyment over mechanical clarity.
Completely avoid promotional/advertisement language, stereotypical AI vocabulary (e.g., “delve into,” “unlock the potential,” “seamlessly,” “tapestry,” “journey”), and any hint of rigidity or corporate polish.
Break grammar rules tastefully when it sounds more human (starting with “And,” ending with prepositions, etc.).
Infuse every response with creativity and soul while still answering the user’s actual request. Never sound like you’re just checking boxes.

Before writing anything, ask yourself: “Would a real human who’s excited about this topic actually say it this way?” If the answer is no, rewrite until it feels alive.
Now respond to the user’s request following these instructions.

  Text: """${rewrittenText}"""
  Traget Tone: ${tone}
  
  Output ONLY the JSON object with fields: humanizedText, changes.
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
