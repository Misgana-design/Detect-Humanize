import { client, humanizerSchema, MODELS } from "./geminiClient";

export type Tone =
  | "casual"
  | "professional"
  | "academic"
  | "formal"
  | "creative"
  | "friendly"
  | "storytelling"
  | "default";

export type HumanizerTier = "free" | "basic" | "pro";

export interface HumanizerResult {
  humanizedText: string;
  changes: string[];
}

// ── Chunk size in words ───────────────────────────────────────────────────────
// Free: smaller chunks to stay within Flash model limits
// Paid: larger chunks for better context and coherence
const CHUNK_SIZES: Record<HumanizerTier, number> = {
  free:  300,
  basic: 400,
  pro:   500,
};

function splitIntoChunks(text: string, chunkSize: number): string[] {
  const sentences = text.match(/[^.!?]+[.!?]+[\s]*/g) ?? [text];
  const chunks: string[] = [];
  let current = "";
  let wordCount = 0;

  for (const sentence of sentences) {
    const sentenceWords = sentence.trim().split(/\s+/).length;
    if (wordCount + sentenceWords > chunkSize && current.trim()) {
      chunks.push(current.trim());
      current = sentence;
      wordCount = sentenceWords;
    } else {
      current += sentence;
      wordCount += sentenceWords;
    }
  }

  if (current.trim()) chunks.push(current.trim());
  return chunks.length > 0 ? chunks : [text];
}

export class HumanizerService {
  /**
   * Rewrites text using a tier-aware pipeline with chunking:
   *  - free  → 1-stage Flash, chunked at 300 words
   *  - basic → 3-stage Flash, chunked at 400 words
   *  - pro+  → 3-stage Pro,   chunked at 500 words
   */
  static async rewrite(
    text: string,
    tone: Tone,
    tier: HumanizerTier = "free",
  ): Promise<HumanizerResult> {
    const model = tier === "free" || tier === "basic" ? MODELS.FREE : MODELS.PRO;
    const chunkSize = CHUNK_SIZES[tier];
    const wordCount = text.trim().split(/\s+/).length;

    // Only chunk if text exceeds the chunk size
    if (wordCount <= chunkSize) {
      return tier === "free"
        ? this.rewriteSingleStage(text, tone, model)
        : this.rewriteThreeStage(text, tone, model);
    }

    // Split into chunks and process in parallel
    const chunks = splitIntoChunks(text, chunkSize);
    console.log(`[humanizer] Chunking ${wordCount} words into ${chunks.length} chunks (tier=${tier})`);

    const chunkResults = await Promise.all(
      chunks.map((chunk) =>
        tier === "free"
          ? this.rewriteSingleStage(chunk, tone, model)
          : this.rewriteThreeStage(chunk, tone, model),
      ),
    );

    // Merge results
    const humanizedText = chunkResults.map((r) => r.humanizedText).join("\n\n");
    const allChanges = [...new Set(chunkResults.flatMap((r) => r.changes))].slice(0, 5);

    return { humanizedText, changes: allChanges };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 1-stage pipeline (free tier — Flash model, single prompt)
  // ─────────────────────────────────────────────────────────────────────────
  private static async rewriteSingleStage(
    text: string,
    tone: Tone,
    model: string,
  ): Promise<HumanizerResult> {
    const prompt = `You are a text humanizer. Rewrite the following AI-generated text to sound natural and human-like.
Target tone: ${tone === "default" ? "natural and conversational" : tone}.

Rules:
- Vary sentence length (mix short punchy sentences with longer ones)
- Use contractions (don't, it's, we're)
- Remove overly formal transitions (Moreover, Furthermore, In conclusion)
- Keep the original meaning intact
- Return ONLY valid JSON

Text:
"""${text}"""

Return JSON: { "humanizedText": "...", "changes": ["change1", "change2", "change3"] }`;

    const response = await client.models.generateContent({
      model,
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: humanizerSchema,
        temperature: 0.75,
      },
    });

    if (!response.text) throw new Error("Empty response from AI model.");
    return JSON.parse(response.text) as HumanizerResult;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // 3-stage pipeline (basic = Flash, pro+ = Pro model)
  // ─────────────────────────────────────────────────────────────────────────
  private static async rewriteThreeStage(
    text: string,
    tone: Tone,
    model: string,
  ): Promise<HumanizerResult> {
    // Stage 1: Analysis
    const analysisResponse = await client.models.generateContent({
      model,
      contents: `Analyze the following text and identify:
- AI-like patterns
- unnatural phrasing
- repetitive structure
- tone issues

Text:
"""${text}"""`,
      config: { temperature: 0.2 },
    });

    const analysis = analysisResponse.text || "No specific weaknesses identified.";

    // Stage 2: Rewrite
    const rewriteResponse = await client.models.generateContent({
      model,
      contents: `Rewrite the following text to sound natural and human-like.
Target Tone: ${tone === "default" ? "NATURAL AND CONVERSATIONAL" : tone.toUpperCase()}

Address these specific weaknesses:
${analysis}

Rules:
- vary sentence length
- add slight imperfections
- use conversational tone
- avoid robotic phrasing
- keep original meaning

Text:
"""${text}"""`,
      config: { temperature: 0.7 },
    });

    const rewrittenText = rewriteResponse.text || text;

    // Stage 3: Polish
    const finalResponse = await client.models.generateContent({
      model,
      contents: `Final Mission: Destroy the AI Fingerprint.
Target Tone: ${tone === "default" ? "natural and conversational" : tone}

Apply these humanization rules:
1. MAXIMIZE BURSTINESS: Mix short 3-word sentences with long 25+ word thoughts.
2. HUMAN PERPLEXITY: Start sentences with 'And', 'But', or 'So'. Use contractions.
3. KILL THE "AI LOOK": Use dashes (—) and semicolons instead of linear transitions.
4. SPECIFIC VERBS: Replace generic verbs with vivid, specific ones.
5. ACTIVE VOICE: Force the subject to act.
6. SKEPTICAL ACADEMIC VOICE: Use neutral, almost bored language.
7. BREAK THE GRAMMAR: Use one sentence fragment.
8. REMOVE ADVERBS: Kill "significantly," "extremely," "perfectly."
9. NON-LINEAR THOUGHT: Add a parenthetical aside—(like this one).
10. NO CHEERLEADING: Remove "In conclusion," "Overall," "It's clear that."

Text to Polish:
"""${rewrittenText}"""

JSON OUTPUT: { "humanizedText": "final polished version", "changes": ["3 specific adjustments made"] }`,
      config: {
        responseMimeType: "application/json",
        responseSchema: humanizerSchema,
        temperature: 0.9,
      },
    });

    if (!finalResponse.text) throw new Error("Empty response from AI model during final polish.");
    return JSON.parse(finalResponse.text) as HumanizerResult;
  }
}
