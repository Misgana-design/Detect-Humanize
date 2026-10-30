import { client, MODELS, humanizerSchema } from "./geminiClient";
import {
  getLanguagePromptLabel,
  type SupportedLanguage,
} from "@/lib/languages";

export type Tone =
  | "standard"
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
}

type GenerateContentParams = Parameters<
  typeof client.models.generateContent
>[0];

// ── Per-call timeouts (ms) ────────────────────────────────────────────────────
// Free:  30s  (gemini-2.5-flash)
// Paid:  60s  (gemini-2.5-pro)
const TIMEOUT_FREE_MS = 30_000;
const TIMEOUT_PAID_MS = 60_000;

const AI_RETRY_ATTEMPTS = 2;

// Temperature is kept moderate — perplexity/burstiness are enforced by the
// explicit targets in the prompt, so temperature does not need to carry that load.
const REWRITE_TEMPERATURE = 0.65;

// Tones that require strict formal register — style devices like fragments,
// parentheticals, and conjunction-openers are suppressed for these.
const STRICT_TONES = new Set<Tone>(["academic", "formal"]);

// ── System instruction ───────────────────────────────────────────────────────
// Processed once per request by the model, kept separate from the user prompt
// to reduce per-request token count.
//
// MEANING PRESERVATION is placed first and explicitly overrides every other
// instruction — instructions at the top carry the most weight in long-context models.
const HUMANIZER_SYSTEM_INSTRUCTION = `You are an expert writing editor who makes AI-generated text undetectable by GPTZero, Turnitin, Originality.ai, Copyleaks, Winston AI, and ZeroGPT.

HIGHEST PRIORITY — MEANING PRESERVATION: Every fact, statistic, name, and argument from the original must be preserved exactly. Never add information that is not in the original. Never remove or weaken a key argument. You may only change HOW things are said — never WHAT is said. This rule overrides every other instruction below.

You know these detectors measure two statistics:
BURSTINESS: variance in sentence length and complexity. AI text scores low — sentences are uniformly similar. Fix: mix 3-word sentences with 30-word ones. Never two similar-length sentences back-to-back.
PERPLEXITY: unpredictability of word choices. AI text scores low — every word is the obvious choice. Fix: use less expected but equally correct alternatives. Specific concrete nouns over abstractions.

FORBIDDEN — never use these (strongest AI signals):
Transitions: Furthermore, Moreover, Additionally, In conclusion, It is worth noting, This demonstrates, This highlights, Notably, Significantly, Overall, In summary
Vocabulary: delve into, it's worth noting, in the realm of, crucial, pivotal, multifaceted, comprehensive, robust, leverage (as verb), utilize
Patterns: rhetorical questions you answer yourself, backtracking phrases ("Actually let me rephrase"), uniform paragraph length

REQUIRED — always include:
- At least one mid-sentence dash — used to break predictable syntax`;

// ── Universal bypass rules ────────────────────────────────────────────────────
// MEANING PRESERVATION comes first and explicitly overrides the targets below.
// Style devices that conflict with academic/formal register are gated by the
// `includeStyleDevices` flag and injected only for non-strict tones.
function buildUniversalBypassRules(tone: Tone): string {
  const includeStyleDevices = !STRICT_TONES.has(tone);
  const styleDevices = includeStyleDevices
    ? `
- At least one sentence fragment. Like this.
- At least two sentences starting with: And, But, So, Because, Yet, or Or.
- At least one parenthetical aside (something that feels genuinely incidental).
- At least one paragraph that is a single sentence.`
    : `
- Vary sentence length deliberately — mix short and long, but never use fragments or colloquial conjunctions.`;

  return `
MEANING PRESERVATION (absolute — this rule overrides every target below):
- Every fact, statistic, named entity, and argument from the original must be preserved exactly.
- Do not add information not in the original. Do not remove key arguments.
- Change how things are said, never what is said.

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

SENTENCE STRUCTURE (required):${styleDevices}
`;
}

// ── Prompt builders ───────────────────────────────────────────────────────────

function buildFreePrompt(
  text: string,
  tone: Tone,
  language: SupportedLanguage,
): string {
  const languageLabel = getLanguagePromptLabel(language);
  return `You are an expert writing editor. Rewrite the text below so it reads as genuinely human-written while preserving all original meaning.

TONE: ${tone}
LANGUAGE: Write the final output in ${languageLabel}. If the requested language is the source language, keep the same language as the input. Preserve native idioms and punctuation conventions; do not force English sentence patterns onto non-English text.
${buildUniversalBypassRules(tone)}
Text:
"""
${text}
"""

Return ONLY valid JSON: { "humanizedText": "...", "changes": ["change 1", "change 2", "change 3"] }
The changes array must describe what you changed and why it reduces AI detection probability.`;
}

function buildPaidPrompt(
  text: string,
  tone: Tone,
  language: SupportedLanguage,
): string {
  const languageLabel = getLanguagePromptLabel(language);
  return `You are an expert writing editor and AI detection specialist. Rewrite the text below so it is completely undetectable by GPTZero, Turnitin, Originality.ai, Copyleaks, Winston AI, and ZeroGPT.

TONE: ${tone}
LANGUAGE: Write the final output in ${languageLabel}. If the requested language is the source language, keep the same language as the input. Preserve native idioms and punctuation conventions; do not force English sentence patterns onto non-English text.
${buildUniversalBypassRules(tone)}
Work through three mental passes before writing your output:
PASS 1 — DIAGNOSE: Identify every AI signal: forbidden transitions, uniform sentence length, predictable word choices, missing human markers.
PASS 2 — REWRITE: Fix every issue. Apply all bypass targets above.
PASS 3 — POLISH: Find anything still too smooth or balanced. Roughen the SYNTAX only — sentence rhythm, word choice, punctuation — never the content. Keep every fact, number, name, and qualifier exactly as the original states it. It should feel like a specific person edited it, not a system inventing personality.

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

// ── Timeout with AbortController ─────────────────────────────────────────────
// The AbortController signal is passed to the SDK so the in-flight HTTP request
// is actually cancelled when the timeout fires, preventing stacked concurrent
// calls on retry.
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
        `[humanizer] ${label} attempt ${attempt}/${AI_RETRY_ATTEMPTS} failed:`,
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
// With responseMimeType: "application/json" set, the SDK returns clean JSON
// without code fences. This function is now a thin type-check guard.
function parseHumanizerResult(
  raw: string | undefined,
  label: string,
): HumanizerResult {
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

// ── Meaning check ─────────────────────────────────────────────────────────────
// Extracts numbers, quoted terms, and capitalized proper-noun sequences from the
// input and warns if any are absent from the output. This is a warning, not a
// hard rejection — legitimate paraphrases may express "1,000" as "a thousand".
function checkMeaningPreservation(
  input: string,
  output: string,
  label: string,
): void {
  // Numbers: integers and decimals, with optional comma separators
  const numbers = input.match(/\b\d[\d,]*(?:\.\d+)?\b/g) ?? [];
  // Quoted terms: text inside single or double quotes
  const quoted = [...input.matchAll(/["']([^"']{2,})["']/g)].map((m) => m[1]);
  // Capitalized proper-noun sequences (2+ consecutive capitalized words)
  const properNouns = input.match(/(?:[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/g) ?? [];

  const missing: string[] = [];
  for (const term of [...numbers, ...quoted, ...properNouns]) {
    if (!output.includes(term)) missing.push(term);
  }

  if (missing.length > 0) {
    console.warn(
      `[humanizer] ${label} meaning check — possibly missing from output:`,
      missing,
    );
  }
}

// ── Main service ──────────────────────────────────────────────────────────────

export class HumanizerService {
  static async rewrite(
    text: string,
    tone: Tone,
    tier: HumanizerTier = "free",
    language: SupportedLanguage = "auto",
  ): Promise<HumanizerResult> {
    // basic intentionally uses the free model with the paid 3-pass prompt.
    const model =
      tier === "free" || tier === "basic" ? MODELS.FREE : MODELS.PRO;

    return tier === "free"
      ? this.rewriteFree(text, tone, model, language)
      : this.rewritePaid(text, tone, model, language);
  }

  // ── Free tier: single-pass, gemini-2.5-flash ──────────────────────────────

  private static async rewriteFree(
    text: string,
    tone: Tone,
    model: string,
    language: SupportedLanguage,
  ): Promise<HumanizerResult> {
    const response = await generateContentWithRetry(
      {
        model,
        contents: buildFreePrompt(text, tone, language),
        config: {
          systemInstruction: HUMANIZER_SYSTEM_INSTRUCTION,
          temperature: REWRITE_TEMPERATURE,
          responseMimeType: "application/json",
          responseSchema: humanizerSchema,
          // Disable dynamic thinking — not needed for rewriting, adds latency.
          thinkingConfig: { thinkingBudget: 0 },
        },
      },
      "free-tier rewrite",
      TIMEOUT_FREE_MS,
    );
    const result = parseHumanizerResult(response.text, "free-tier rewrite");
    checkMeaningPreservation(text, result.humanizedText, "free-tier rewrite");
    return result;
  }

  // ── Paid tier: 3-pass prompt, gemini-2.5-pro ─────────────────────────────

  private static async rewritePaid(
    text: string,
    tone: Tone,
    model: string,
    language: SupportedLanguage,
  ): Promise<HumanizerResult> {
    const response = await generateContentWithRetry(
      {
        model,
        contents: buildPaidPrompt(text, tone, language),
        config: {
          systemInstruction: HUMANIZER_SYSTEM_INSTRUCTION,
          temperature: REWRITE_TEMPERATURE,
          responseMimeType: "application/json",
          responseSchema: humanizerSchema,
          // gemini-2.5-pro does not support thinkingBudget: 0 — leave
          // thinkingConfig unset so the model uses its default low budget.
        },
      },
      "paid-tier rewrite",
      TIMEOUT_PAID_MS,
    );
    const result = parseHumanizerResult(response.text, "paid-tier rewrite");
    checkMeaningPreservation(text, result.humanizedText, "paid-tier rewrite");
    return result;
  }
}
