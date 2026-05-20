import { client, humanizerSchema, MODELS } from "./geminiClient";

export type Tone =
  | "casual"
  | "professional"
  | "academic"
  | "formal"
  | "creative"
  | "friendly"
  | "storytelling";

export type HumanizerTier = "free" | "basic" | "pro";

export interface HumanizerResult {
  humanizedText: string;
  changes: string[];
  fallback?: boolean;
}

type GenerateContentParams = Parameters<typeof client.models.generateContent>[0];

// ── Chunk sizes per tier ──────────────────────────────────────────────────────
const CHUNK_SIZES: Record<HumanizerTier, number> = {
  free:  300,
  basic: 400,
  pro:   500,
};

// ── Per-stage timeouts (ms) ───────────────────────────────────────────────────
// Pro model is slower than Flash — give it generous headroom.
// Free (1 call):  35s
// Paid (3 calls): 30s + 30s + 30s = 90s — fits inside 120s maxDuration
const TIMEOUT_FREE_MS     = 35_000;
const TIMEOUT_ANALYSIS_MS = 30_000;
const TIMEOUT_REWRITE_MS  = 30_000;
const TIMEOUT_POLISH_MS   = 30_000;

const AI_RETRY_ATTEMPTS = 3;

// ── Tone-specific instruction blocks ─────────────────────────────────────────
const TONE_RULES: Record<Tone, string> = {
  casual:
    "Write the way a smart person texts a friend — relaxed, direct, occasionally " +
    "colloquial. Contractions everywhere. Short punchy sentences are fine.",

  professional:
    "Maintain a polished, confident register suitable for business communication. " +
    "Avoid slang. Use contractions sparingly. Vocabulary should be precise but not " +
    "academic. No jargon unless it was in the original.",

  academic:
    "Preserve formal academic register. Third person where the original uses it. " +
    "No contractions. Technical vocabulary from the source text must be kept. " +
    "Sentence structure should be varied but never colloquial.",

  formal:
    "Strict formal register. No contractions. No colloquialisms. Vocabulary should " +
    "be elevated but not archaic. Suitable for legal, governmental, or official documents.",

  creative:
    "Lean into vivid, sensory language. Use metaphor and unexpected word choices. " +
    "Rhythm matters — read it aloud in your head. Short sentences for impact, long " +
    "ones for flow. Break grammar rules deliberately when it serves the voice.",

  friendly:
    "Warm, approachable, encouraging tone. Write like a knowledgeable friend " +
    "explaining something. Contractions throughout. Occasional light humour is fine.",

  storytelling:
    "Narrative voice. Build tension with sentence length — short for drama, long for " +
    "immersion. Use active verbs. Ground abstract ideas in concrete scenes or moments. " +
    "The reader should feel pulled forward.",
};

// ── Universal bypass rules (applied to every tier and tone) ──────────────────
// These target the statistical signals that GPTZero, Turnitin, Originality.ai,
// Copyleaks, Winston AI, and ZeroGPT all rely on: burstiness and perplexity.
const UNIVERSAL_BYPASS_RULES = `
STATISTICAL BYPASS RULES — these are non-negotiable regardless of tone:

BURSTINESS (most important signal):
- At least 25% of sentences must be under 8 words.
- At least 20% of sentences must exceed 25 words.
- Never place two sentences of similar length back-to-back.
- Deliberately alternate: short. Then a longer, more complex sentence that develops the idea further. Short again. Then sprawling.

PERPLEXITY (second most important signal):
- Replace predictable word choices with less expected but equally correct alternatives.
  Bad: "It is important to consider" → Good: "Worth pausing on"
  Bad: "This demonstrates that"     → Good: "Which tells you something"
  Bad: "In order to achieve"        → Good: "To actually get there"
- Use specific concrete nouns instead of abstract ones wherever possible.
- Introduce at least one mid-sentence pivot using a dash — like this — to break predictable syntax.
- Use at least one semicolons or colon in a non-standard way; not just to list things.

FORBIDDEN PATTERNS (these are the strongest AI signals — never use them):
- Never start a sentence with: Furthermore, Moreover, Additionally, In conclusion,
  It is worth noting, It is important to note, This demonstrates, This shows,
  This highlights, Overall, In summary, To summarize, Notably, Significantly.
- Never use: "delve into", "it's worth noting", "in the realm of", "as an AI",
  "I cannot", "I must emphasize", "crucial", "pivotal", "multifaceted",
  "comprehensive", "robust", "leverage" (as a verb), "utilize" (use "use").
- No rhetorical questions followed by self-answers — detectors flag this pattern.
- No backtracking phrases like "Actually, let me rephrase" — this is a known AI tell.
- No first-person unless the original text was first-person.

SENTENCE STRUCTURE VARIATION:
- Use at least one sentence fragment for emphasis. Like this.
- Start at least two sentences with a conjunction: And, But, So, Because, Yet, Or.
- Use at least one parenthetical aside (something that feels like a genuine aside).
- Vary paragraph length: at least one paragraph should be a single sentence.

MEANING PRESERVATION:
- Every factual claim, statistic, and named entity from the original must be preserved exactly.
- Do not add information that was not in the original text.
- Do not remove key arguments or evidence.
`;

// ── Prompt builders ───────────────────────────────────────────────────────────

function buildFreePrompt(text: string, tone: Tone): string {
  return `You are an expert writing editor specializing in making AI-generated text undetectable by AI detection systems including GPTZero, Turnitin, Originality.ai, Copyleaks, Winston AI, and ZeroGPT.

Your task: Rewrite the text below so it reads as genuinely human-written while preserving all original meaning.

TONE REQUIREMENT:
${TONE_RULES[tone]}

${UNIVERSAL_BYPASS_RULES}

Text to rewrite:
"""
${text}
"""

Return ONLY valid JSON in this exact format:
{
  "humanizedText": "your complete rewritten text here",
  "changes": ["specific change 1", "specific change 2", "specific change 3"]
}

The "changes" array must describe exactly what you changed and why it reduces AI detection probability.`;
}

function buildAnalysisPrompt(text: string): string {
  return `You are an AI detection expert. Analyze this text and list ONLY the specific phrases and patterns that would cause GPTZero, Turnitin, or Originality.ai to flag it as AI-generated.

Be brief and specific. Output a numbered list of issues only — no explanations, no headers, no preamble.

Focus on:
- Forbidden transition phrases (Furthermore, Moreover, Additionally, In conclusion, etc.)
- Sentences with identical length/structure to adjacent sentences (low burstiness)
- Predictable word choices that a human would vary (low perplexity)
- Overly formal or generic vocabulary (utilize, facilitate, demonstrate, crucial, pivotal, robust)
- Missing human markers (no fragments, no conjunction-started sentences, no parentheticals)

Text:
"""
${text}
"""

Output format — numbered list only, max 10 items:
1. [issue]
2. [issue]
...`;
}

function buildRewritePrompt(text: string, tone: Tone, analysis: string): string {
  return `You are an expert ghostwriter. Using the analysis below as your guide, rewrite the text to eliminate every AI detection signal identified.

TONE REQUIREMENT:
${TONE_RULES[tone]}

ISSUES TO FIX (from analysis):
${analysis}

${UNIVERSAL_BYPASS_RULES}

Original text:
"""
${text}
"""

Produce a complete rewrite that addresses every issue in the analysis. Do not return JSON yet — return only the rewritten text as plain prose. This will be polished in a final pass.`;
}

function buildPolishPrompt(rewrittenText: string, tone: Tone): string {
  return `You are a master editor doing a final pass on a text that has already been rewritten for human authenticity. Your job is to push it further — make it genuinely unpredictable and natural.

TONE REQUIREMENT:
${TONE_RULES[tone]}

${UNIVERSAL_BYPASS_RULES}

ADDITIONAL POLISH DIRECTIVES (apply these on top of the bypass rules):
- Read the text as if you are a tired but sharp human writer at the end of a long day.
- Find any remaining sentences that feel "generated" — too smooth, too balanced, too complete — and roughen them.
- Introduce at least one unexpected but correct word choice that a human writer might use but an AI would not predict.
- If any paragraph still has uniform sentence length, break it.
- The final text should feel like it was written by a specific person with a specific voice, not by a system trying to sound human.
- Preserve all facts, names, statistics, and arguments from the input exactly.

Text to polish:
"""
${rewrittenText}
"""

Return ONLY valid JSON in this exact format:
{
  "humanizedText": "your final polished text here",
  "changes": ["specific change 1", "specific change 2", "specific change 3"]
}

The "changes" array must describe the 3 most impactful changes you made to reduce AI detection probability.`;
}

// ── Utility functions ─────────────────────────────────────────────────────────

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function isTransientError(error: unknown) {
  const message = errorMessage(error).toLowerCase();
  return (
    message.includes("timeout") ||
    message.includes("temporarily") ||
    message.includes("unavailable") ||
    message.includes("overload") ||
    message.includes("rate") ||
    message.includes("quota") ||
    message.includes("503") ||
    message.includes("504") ||
    message.includes("429")
  );
}

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(
      () => reject(new Error(`AI request timed out after ${timeoutMs}ms.`)),
      timeoutMs,
    );
  });
  try {
    return await Promise.race([promise, timeout]);
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}

async function generateContentWithRetry(
  params: GenerateContentParams,
  label: string,
  timeoutMs: number,
) {
  let lastError: unknown;
  for (let attempt = 1; attempt <= AI_RETRY_ATTEMPTS; attempt++) {
    try {
      return await withTimeout(client.models.generateContent(params), timeoutMs);
    } catch (error) {
      lastError = error;
      console.warn(
        `[humanizer] ${label} attempt ${attempt}/${AI_RETRY_ATTEMPTS} failed:`,
        errorMessage(error),
      );
      if (attempt === AI_RETRY_ATTEMPTS || !isTransientError(error)) break;
      await sleep(400 * attempt);
    }
  }
  throw lastError instanceof Error ? lastError : new Error("AI request failed.");
}

function parseHumanizerResult(raw: string | undefined, label: string): HumanizerResult {
  if (!raw) throw new Error(`Empty response from AI model during ${label}.`);
  try {
    const parsed = JSON.parse(raw) as Partial<HumanizerResult>;
    if (typeof parsed.humanizedText !== "string" || !Array.isArray(parsed.changes)) {
      throw new Error("Response did not match the expected shape.");
    }
    return {
      humanizedText: parsed.humanizedText,
      changes: parsed.changes.filter((c): c is string => typeof c === "string"),
    };
  } catch (error) {
    throw new Error(`AI returned invalid JSON during ${label}: ${errorMessage(error)}`);
  }
}

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

function applyLocalFallback(text: string, tone: Tone): HumanizerResult {
  const replacements: Array<[RegExp, string]> = [
    [/\bMoreover,\s*/gi,                  "Also, "],
    [/\bFurthermore,\s*/gi,               "Plus, "],
    [/\bAdditionally,\s*/gi,              "Also, "],
    [/\bIn conclusion,\s*/gi,             "To wrap up, "],
    [/\bIt is important to note that\s*/gi, ""],
    [/\bIt is worth noting that\s*/gi,    ""],
    [/\bThis demonstrates that\s*/gi,     "This means "],
    [/\bThis highlights\s*/gi,            "This shows "],
    [/\butilize\b/gi,                     "use"],
    [/\bfacilitate\b/gi,                  "help"],
    [/\bdemonstrate\b/gi,                 "show"],
    [/\bapproximately\b/gi,               "about"],
    [/\bsignificantly\b/gi,               "noticeably"],
    [/\bcrucial\b/gi,                     "important"],
    [/\bpivotal\b/gi,                     "key"],
    [/\brobust\b/gi,                      "strong"],
    [/\bcomprehensive\b/gi,               "thorough"],
    [/\bleverage\b/gi,                    "use"],
    [/\bdo not\b/gi,                      "don't"],
    [/\bdoes not\b/gi,                    "doesn't"],
    [/\bcannot\b/gi,                      "can't"],
    [/\bwill not\b/gi,                    "won't"],
    [/\bit is\b/gi,                       "it's"],
    [/\bthat is\b/gi,                     "that's"],
  ];

  let humanized = text.trim().replace(/\r\n/g, "\n");
  for (const [pattern, replacement] of replacements) {
    humanized = humanized.replace(pattern, replacement);
  }
  humanized = humanized
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/\s+([,.;:!?])/g, "$1");

  if (tone === "academic" || tone === "formal") {
    humanized = humanized.replace(/\bPlus,\s*/g, "Additionally, ");
  }

  return {
    humanizedText: humanized,
    changes: [
      "Backup humanizer used — AI service temporarily unavailable.",
      "Removed common AI transition phrases (Moreover, Furthermore, etc.).",
      "Applied contraction expansion and vocabulary simplification.",
    ],
    fallback: true,
  };
}

// ── Main service ──────────────────────────────────────────────────────────────

export class HumanizerService {
  static async rewrite(
    text: string,
    tone: Tone,
    tier: HumanizerTier = "free",
  ): Promise<HumanizerResult> {
    const model = tier === "free" || tier === "basic" ? MODELS.FREE : MODELS.PRO;
    const chunkSize = CHUNK_SIZES[tier];
    const wordCount = text.trim().split(/\s+/).length;

    if (wordCount <= chunkSize) {
      return tier === "free"
        ? this.rewriteFree(text, tone, model)
        : this.rewritePaid(text, tone, model);
    }

    // Long text: chunk and process sequentially
    const chunks = splitIntoChunks(text, chunkSize);
    console.log(`[humanizer] Chunking ${wordCount} words into ${chunks.length} chunks (tier=${tier})`);

    const results: HumanizerResult[] = [];
    for (let i = 0; i < chunks.length; i++) {
      const result = await (tier === "free"
        ? this.rewriteFree(chunks[i], tone, model)
        : this.rewritePaid(chunks[i], tone, model));
      results.push(result);
    }

    return {
      humanizedText: results.map((r) => r.humanizedText).join("\n\n"),
      changes: [...new Set(results.flatMap((r) => r.changes))].slice(0, 5),
      fallback: results.some((r) => r.fallback),
    };
  }

  // ── Free tier: single AI call ─────────────────────────────────────────────

  private static async rewriteFree(
    text: string,
    tone: Tone,
    model: string,
  ): Promise<HumanizerResult> {
    try {
      const response = await generateContentWithRetry(
        {
          model,
          contents: buildFreePrompt(text, tone),
          config: {
            responseMimeType: "application/json",
            responseSchema: humanizerSchema,
            temperature: 0.8,
          },
        },
        "free-tier rewrite",
        TIMEOUT_FREE_MS,
      );
      return parseHumanizerResult(response.text, "free-tier rewrite");
    } catch (error) {
      console.error("[humanizer] Free tier failed, using local fallback:", errorMessage(error));
      return applyLocalFallback(text, tone);
    }
  }

  // ── Paid tier: true 3-stage pipeline ─────────────────────────────────────
  // Stage 1 (18s): Analysis — identifies every AI signal in the text
  // Stage 2 (22s): Rewrite — fixes all identified issues, returns plain text
  // Stage 3 (22s): Polish — final pass for unpredictability, returns JSON
  // Total budget: ~62s, well within 120s maxDuration

  private static async rewritePaid(
    text: string,
    tone: Tone,
    model: string,
  ): Promise<HumanizerResult> {
    try {
      // ── Stage 1: Analysis ──────────────────────────────────────────────────
      const analysisResponse = await generateContentWithRetry(
        {
          model,
          contents: buildAnalysisPrompt(text),
          config: { temperature: 0.15 },
        },
        "stage-1 analysis",
        TIMEOUT_ANALYSIS_MS,
      );

      const analysis = analysisResponse.text?.trim() || "No specific issues identified.";
      console.log(`[humanizer] Stage 1 complete (${analysis.length} chars of analysis)`);

      // ── Stage 2: Rewrite ───────────────────────────────────────────────────
      const rewriteResponse = await generateContentWithRetry(
        {
          model,
          contents: buildRewritePrompt(text, tone, analysis),
          config: { temperature: 0.75 },
        },
        "stage-2 rewrite",
        TIMEOUT_REWRITE_MS,
      );

      const rewrittenText = rewriteResponse.text?.trim() || text;
      console.log(`[humanizer] Stage 2 complete (${rewrittenText.split(/\s+/).length} words)`);

      // ── Stage 3: Polish ────────────────────────────────────────────────────
      const polishResponse = await generateContentWithRetry(
        {
          model,
          contents: buildPolishPrompt(rewrittenText, tone),
          config: {
            responseMimeType: "application/json",
            responseSchema: humanizerSchema,
            temperature: 0.92,
          },
        },
        "stage-3 polish",
        TIMEOUT_POLISH_MS,
      );

      const result = parseHumanizerResult(polishResponse.text, "stage-3 polish");
      console.log(`[humanizer] Stage 3 complete — final output ready`);
      return result;

    } catch (error) {
      console.error("[humanizer] Paid tier pipeline failed, using local fallback:", errorMessage(error));
      return applyLocalFallback(text, tone);
    }
  }
}
