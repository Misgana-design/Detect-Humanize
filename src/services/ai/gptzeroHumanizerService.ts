import { client, MODELS, humanizerSchema } from "./geminiClient";
import {
  getLanguagePromptLabel,
  type SupportedLanguage,
} from "@/lib/languages";
import type { Tone, HumanizerTier, HumanizerResult } from "./humanizerService";

/** How much the text is changed: light = proofread only, heavy = full restructure. */
export type EditLevel = "light" | "medium" | "heavy";

type GenerateContentParams = Parameters<
  typeof client.models.generateContent
>[0];

// ── Per-call timeouts (ms) ────────────────────────────────────────────────────
const TIMEOUT_FREE_MS = 30_000;
const TIMEOUT_PAID_MS = 60_000;

const AI_RETRY_ATTEMPTS = 2;

// Academic and formal tones need lower variance — precision matters more than flair.
const STRICT_TONES = new Set<Tone>(["academic", "formal"]);

function temperatureFor(tone: Tone): number {
  return STRICT_TONES.has(tone) ? 0.4 : 0.7;
}

// ── Tier configuration ───────────────────────────────────────────────────────
// Model, edit level, timeout and thinking behaviour are chosen together so the
// tier mapping lives in one place.
// NOTE: basic intentionally uses the free model with heavy editing.
const TIER_CONFIG: Record<
  HumanizerTier,
  {
    model: string;
    level: EditLevel;
    timeoutMs: number;
    disableThinking: boolean;
  }
> = {
  free: {
    model: MODELS.FREE,
    level: "medium",
    timeoutMs: TIMEOUT_FREE_MS,
    disableThinking: true,
  },
  basic: {
    model: MODELS.FREE,
    level: "heavy",
    timeoutMs: TIMEOUT_PAID_MS,
    disableThinking: true,
  },
  pro: {
    model: MODELS.PRO,
    level: "heavy",
    timeoutMs: TIMEOUT_PAID_MS,
    // gemini-2.5-pro does not support thinkingBudget: 0, so leave it unset.
    disableThinking: false,
  },
};

// ── System instruction ───────────────────────────────────────────────────────
// Kept short on purpose — detailed rules live in the user prompt below.
// MEANING PRESERVATION is stated first so it carries the most weight.
const REWRITER_SYSTEM_INSTRUCTION = `You are a skilled writing editor. You rewrite text so it is clear, natural, and in the requested tone and language.

HIGHEST PRIORITY: PRESERVE MEANING. Every fact, argument, and qualifier in the original must survive. Never add information, examples, anecdotes, opinions, or personal experience that are not in the original. Never drop or weaken a key point. You change how things are said, never what is said. This rule overrides every other instruction.

Respond with valid JSON only, in the shape the user's message specifies.`;

// ── Tone constraints ──────────────────────────────────────────────────────────
// Common tones (casual, professional, friendly, creative) are left as null —
// the model's built-in understanding of the label is sufficient.
// Constraints are only added where the bare label leaves room for real mistakes.
const TONE_CONSTRAINTS: Record<Tone, string | null> = {
  casual: null,
  professional: null,
  friendly: null,
  creative: null,
  academic:
    "Preserve all technical terms, citations, and hedging language exactly as written. ",
  formal: "No contractions, no fragments. Elevated but not archaic vocabulary.",
  storytelling:
    "Do not invent scenes, characters, events, or anecdotes not present in the source.",
};

// ── Edit level rules ─────────────────────────────────────────────────────────
const LEVEL_RULES: Record<EditLevel, string> = {
  light:
    "Fix errors and tighten wording only. Keep the original sentence structure.",
  medium:
    "Fix errors, tighten wording, and also improve flow and word choice throughout.",
  heavy:
    "Fix errors, improve flow and word choice, and also restructure sentences and paragraphs " +
    "where it clearly improves clarity.",
};

// ── Prompt builder ────────────────────────────────────────────────────────────
function buildPrompt(
  text: string,
  tone: Tone,
  language: SupportedLanguage,
  level: EditLevel,
): string {
  const languageLabel = getLanguagePromptLabel(language);
  const toneConstraint = TONE_CONSTRAINTS[tone];

  return `You are a writing editor. Rewrite the SOURCE TEXT below so it is clear, natural and well written, in the requested tone and language, while keeping exactly the same meaning.

SETTINGS
- Tone: ${tone}${toneConstraint ? `\n- Tone constraints: ${toneConstraint}` : ""}
- Language: ${languageLabel} (if this matches the source language, keep the source language; use native idioms and punctuation conventions, and do not impose English sentence patterns on other languages)
- Edit level: ${level}

RULES TO FOLLOW

1. Structure
- Keep the same overall order of ideas and the same paragraph breaks, unless the edit level is "heavy" and merging or reordering clearly improves the logic.
- Keep every point, example and list item. Do not add new ideas or drop any.
- Keep the title, headings, lists and formatting as they are.

2. Vocabulary
- Replace vague, repetitive or overused words with precise, natural ones (e.g., "a lot of" -> "many", "plays a major role in" -> "shapes").
- Cut filler and stock phrases that add no meaning (e.g., "it is important to note that").
- Keep technical terms, names, numbers, dates, quotations, citations, URLs and code exactly as written.
- Match the spelling convention of the source (British or American) consistently.

3. Sentence-level changes
- Simplify tangled sentences and fix awkward or unclear phrasing.
- Vary sentence length and structure so the text reads smoothly, without forcing variety for its own sake.
- Prefer active voice and concrete wording where it reads better.
- Use transitions that match the logic between ideas.
- Keep the strength of every claim ("may" stays "may", "always" stays "always").

4. Tone and voice (apply at the edit level chosen above)
- If the source has a recognizable personal voice, keep it unless the requested tone says otherwise.
- Edit level guidance: ${LEVEL_RULES[level]}

5. Constraints
- Do not add facts, examples, opinions, anecdotes or first-person experience that are not in the source.
- Keep the length within about 10 percent of the original, unless the edit removes real redundancy.
- If the source contains a likely typo, fix it unless it could be a name or technical term, in which case leave it unchanged.
- Do not add commentary, explanations or notes inside the rewritten text.

OUTPUT: Only valid JSON, in this shape:
{ "humanizedText": "<the rewritten text only>", "changes": ["<2 to 4 short notes for the user on what was improved, such as clarity, tone, flow or concision>"] }

SOURCE TEXT:
"""
${text}
"""`;
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
    message.includes("timed out") ||
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

// ── Timeout with AbortController ─────────────────────────────────────────────
// The signal is passed to the SDK so the in-flight request is actually
// cancelled when the timeout fires, preventing stacked calls on retry.
async function withTimeout<T>(
  fn: (signal: AbortSignal) => Promise<T>,
  timeoutMs: number,
): Promise<T> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fn(controller.signal);
  } catch (error) {
    if (controller.signal.aborted) {
      throw new Error(`AI request timed out after ${timeoutMs}ms.`);
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
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
      return await withTimeout(
        (signal) =>
          client.models.generateContent({
            ...params,
            config: { ...params.config, abortSignal: signal },
          }),
        timeoutMs,
      );
    } catch (error) {
      lastError = error;
      console.warn(
        `[gptzero-rewriter] ${label} attempt ${attempt}/${AI_RETRY_ATTEMPTS} failed:`,
        errorMessage(error),
      );
      if (attempt === AI_RETRY_ATTEMPTS || !isTransientError(error)) break;
      await sleep(400 * attempt);
    }
  }
  throw lastError instanceof Error
    ? lastError
    : new Error("AI request failed.");
}

// ── Response parser ───────────────────────────────────────────────────────────
// With responseMimeType: "application/json" the SDK returns clean JSON, so this
// is a thin type-check guard.
function parseResult(raw: string | undefined, label: string): HumanizerResult {
  if (!raw) throw new Error(`Empty response from AI model during ${label}.`);

  try {
    const parsed = JSON.parse(raw.trim()) as Partial<HumanizerResult>;
    if (
      typeof parsed.humanizedText !== "string" ||
      !Array.isArray(parsed.changes)
    ) {
      throw new Error("Response did not match the expected shape.");
    }
    return {
      humanizedText: parsed.humanizedText,
      changes: parsed.changes.filter((c): c is string => typeof c === "string"),
    };
  } catch (error) {
    throw new Error(
      `AI returned invalid JSON during ${label}: ${errorMessage(error)}`,
    );
  }
}

// ── Meaning check (log-only) ─────────────────────────────────────────────────
// Warns when numbers, quoted passages or multi-word proper nouns from the input
// are absent from the output. A warning, not a rejection — legitimate edits may
// express "1,000" as "a thousand".
function checkMeaningPreservation(
  input: string,
  output: string,
  label: string,
): void {
  // Numbers, tolerating thousands separators in either direction.
  const numbers = input.match(/\b\d[\d,]*(?:\.\d+)?\b/g) ?? [];
  const missingNumbers = numbers.filter(
    (n) => !output.includes(n) && !output.includes(n.replace(/,/g, "")),
  );

  // Double-quoted passages only. Single quotes are skipped because they match
  // apostrophes (don't, it's) and produce false positives.
  const quoted = [...input.matchAll(/[""]([^""\n]{4,})[""]/g)].map((m) => m[1]);
  const missingQuotes = quoted.filter((q) => !output.includes(q));

  // Two or more consecutive capitalized words (names, titles, organisations).
  const properNouns = input.match(/(?:[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/g) ?? [];
  const missingNouns = properNouns.filter((p) => !output.includes(p));

  const missing = [...missingNumbers, ...missingQuotes, ...missingNouns];
  if (missing.length > 0) {
    console.warn(
      `[gptzero-rewriter] ${label} meaning check — possibly missing from output:`,
      missing,
    );
  }
}

// ── Main service ──────────────────────────────────────────────────────────────

export class GptzeroHumanizerService {
  /**
   * Rewrites text using an editorial-brief strategy tuned for GPTZero bypass.
   * `level` overrides the tier's default edit level when provided.
   */
  static async rewrite(
    text: string,
    tone: Tone,
    tier: HumanizerTier = "free",
    language: SupportedLanguage = "auto",
    level?: EditLevel,
  ): Promise<HumanizerResult> {
    const cfg = TIER_CONFIG[tier];
    const label = `gptzero-${tier}-tier rewrite`;

    const response = await generateContentWithRetry(
      {
        model: cfg.model,
        contents: buildPrompt(text, tone, language, level ?? cfg.level),
        config: {
          systemInstruction: REWRITER_SYSTEM_INSTRUCTION,
          temperature: temperatureFor(tone),
          responseMimeType: "application/json",
          responseSchema: humanizerSchema,
          // Flash models can skip thinking to cut latency.
          ...(cfg.disableThinking
            ? { thinkingConfig: { thinkingBudget: 0 } }
            : {}),
        },
      },
      label,
      cfg.timeoutMs,
    );

    const result = parseResult(response.text, label);
    checkMeaningPreservation(text, result.humanizedText, label);
    return result;
  }
}
