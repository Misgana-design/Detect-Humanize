import { client, MODELS } from "./geminiClient";

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

// ── Per-call timeouts (ms) ────────────────────────────────────────────────────
// Free:  35s  (Flash model, single-pass prompt)
// Paid:  175s (Pro model, 3-pass prompt — Vercel allows 300s on Pro plan)
const TIMEOUT_FREE_MS  = 65_000;
const TIMEOUT_PAID_MS  = 175_000;

const AI_RETRY_ATTEMPTS = 3;

// ── System instruction (processed once, not repeated per request) ────────────
// Kept separate from the user prompt to reduce per-request token count.
const HUMANIZER_SYSTEM_INSTRUCTION = `You are an expert writing editor who makes AI-generated text undetectable by GPTZero, Turnitin, Originality.ai, Copyleaks, Winston AI, and ZeroGPT.

You know these detectors measure two statistics:
BURSTINESS: variance in sentence length and complexity. AI text scores low — sentences are uniformly similar. Fix: mix 3-word sentences with 30-word ones. Never two similar-length sentences back-to-back.
PERPLEXITY: unpredictability of word choices. AI text scores low — every word is the obvious choice. Fix: use less expected but equally correct alternatives. Specific concrete nouns over abstractions.

FORBIDDEN — never use these (strongest AI signals):
Transitions: Furthermore, Moreover, Additionally, In conclusion, It is worth noting, This demonstrates, This highlights, Notably, Significantly, Overall, In summary
Vocabulary: delve into, it's worth noting, in the realm of, crucial, pivotal, multifaceted, comprehensive, robust, leverage (as verb), utilize
Patterns: rhetorical questions you answer yourself, backtracking phrases ("Actually let me rephrase"), uniform paragraph length

REQUIRED — always include:
- At least one sentence fragment. Like this.
- At least two sentences starting with: And, But, So, Because, Yet, or Or
- At least one parenthetical aside (like this one)
- At least one paragraph that is a single sentence
- Mid-sentence dash — used to break predictable syntax
- Preserve every fact, statistic, name, and argument from the original exactly`;

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

// ── Universal bypass rules — injected into every user prompt ─────────────────
// The system instruction covers the "what" — this covers the "how" with
// concrete targets the model can act on immediately.
const UNIVERSAL_BYPASS_RULES = `
BURSTINESS TARGETS (non-negotiable):
- At least 25% of sentences must be under 8 words.
- At least 20% of sentences must exceed 25 words.
- Never two sentences of similar length back-to-back. Alternate: short. Then a longer, more complex one that develops the idea. Short again. Then sprawling.

PERPLEXITY TARGETS (non-negotiable):
- Replace predictable word choices with less expected but equally correct alternatives.
  Bad: "It is important to consider" → Good: "Worth pausing on"
  Bad: "This demonstrates that"     → Good: "Which tells you something"
  Bad: "In order to achieve"        → Good: "To actually get there"
- Use specific concrete nouns instead of abstract ones wherever possible.
- At least one mid-sentence dash — like this — to break predictable syntax.

SENTENCE STRUCTURE (required):
- At least one sentence fragment. Like this.
- At least two sentences starting with: And, But, So, Because, Yet, or Or.
- At least one parenthetical aside (something that feels genuinely incidental).
- At least one paragraph that is a single sentence.

MEANING PRESERVATION (absolute):
- Every fact, statistic, named entity, and argument from the original must be preserved exactly.
- Do not add information not in the original. Do not remove key arguments.
`;

// ── Prompt builders ───────────────────────────────────────────────────────────

function buildFreePrompt(text: string, tone: Tone): string {
  return `You are an expert writing editor. Rewrite the text below so it reads as genuinely human-written while preserving all original meaning.

TONE: ${TONE_RULES[tone]}
${UNIVERSAL_BYPASS_RULES}
Text:
"""
${text}
"""

Return ONLY valid JSON: { "humanizedText": "...", "changes": ["change 1", "change 2", "change 3"] }
The changes array must describe what you changed and why it reduces AI detection probability.`;
}

function buildPaidPrompt(text: string, tone: Tone): string {
  return `You are an expert writing editor and AI detection specialist. Rewrite the text below so it is completely undetectable by GPTZero, Turnitin, Originality.ai, Copyleaks, Winston AI, and ZeroGPT.

TONE: ${TONE_RULES[tone]}
${UNIVERSAL_BYPASS_RULES}
Work through three mental passes before writing your output:
PASS 1 — DIAGNOSE: Identify every AI signal: forbidden transitions, uniform sentence length, predictable word choices, missing human markers.
PASS 2 — REWRITE: Fix every issue. Apply all bypass targets above.
PASS 3 — POLISH: Find anything still too smooth or balanced. Roughen it. Make it feel like a specific person wrote it, not a system trying to sound human.

Text:
"""
${text}
"""

Return ONLY valid JSON: { "humanizedText": "...", "changes": ["3 most impactful changes made"] }
The changes array must describe the 3 changes that most reduce AI detection probability.`;
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

  // Strip markdown code fences if present (Gemini sometimes wraps JSON in ```json)
  let cleaned = raw.trim();
  if (cleaned.startsWith("```json")) {
    cleaned = cleaned.replace(/^```json\s*/, "").replace(/\s*```$/, "");
  } else if (cleaned.startsWith("```")) {
    cleaned = cleaned.replace(/^```\s*/, "").replace(/\s*```$/, "");
  }

  // Extract JSON object via regex as final fallback
  const match = cleaned.match(/\{[\s\S]*\}/);
  if (match) cleaned = match[0];

  try {
    const parsed = JSON.parse(cleaned) as Partial<HumanizerResult>;
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

    // Single call — no chunking. Chunking re-enabled once Pro model latency is resolved.
    return tier === "free"
      ? this.rewriteFree(text, tone, model)
      : this.rewritePaid(text, tone, model);
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
            systemInstruction: HUMANIZER_SYSTEM_INSTRUCTION,
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

  // ── Paid tier: Pro model, 3-pass prompt, 90s timeout ────────────────────────
  // Pro model (gemini-3.1-pro-preview) for maximum humanization quality.
  // Academic/formal tones use lower temperature for faster, more precise output.

  private static async rewritePaid(
    text: string,
    tone: Tone,
    model: string,
  ): Promise<HumanizerResult> {
    // All tones use 0.92 — high temperature maximises perplexity and burstiness
    // which are the two core metrics AI detectors measure.
    const temperature = 0.92;

    try {
      const response = await generateContentWithRetry(
        {
          model,
          contents: buildPaidPrompt(text, tone),
          config: {
            systemInstruction: HUMANIZER_SYSTEM_INSTRUCTION,
            temperature,
          },
        },
        "paid-tier rewrite",
        TIMEOUT_PAID_MS,
      );
      return parseHumanizerResult(response.text, "paid-tier rewrite");
    } catch (error) {
      console.error("[humanizer] Paid tier failed, using local fallback:", errorMessage(error));
      return applyLocalFallback(text, tone);
    }
  }
}
