import { client, MODELS, humanizerSchema } from "./geminiClient";
import type { SupportedLanguage } from "@/lib/languages";
import type { Tone, HumanizerTier, HumanizerResult } from "./humanizerService";

type GenerateContentParams = Parameters<
  typeof client.models.generateContent
>[0];

// ── Per-call timeouts (ms) ────────────────────────────────────────────────────
const TIMEOUT_FREE_MS = 30_000;
const TIMEOUT_PAID_MS = 60_000;

const AI_RETRY_ATTEMPTS = 2;

// The prompt is engineered for a formal academic register — a fixed moderate
// temperature keeps output consistent without suppressing vocabulary variation.
const TEMPERATURE = 0.45;

// ── Tier configuration ───────────────────────────────────────────────────────
// NOTE: basic intentionally uses the free model with the paid timeout.
const TIER_CONFIG: Record<
  HumanizerTier,
  { model: string; timeoutMs: number; disableThinking: boolean }
> = {
  free:  { model: MODELS.FREE, timeoutMs: TIMEOUT_FREE_MS, disableThinking: true  },
  basic: { model: MODELS.FREE, timeoutMs: TIMEOUT_PAID_MS, disableThinking: true  },
  pro:   { model: MODELS.PRO,  timeoutMs: TIMEOUT_PAID_MS, disableThinking: false },
};

// ── System instruction ───────────────────────────────────────────────────────
// Aligned with the prompt's purpose: formal paraphrase that preserves content
// exactly. No mention of tone or naturalness — the prompt handles all of that.
const REWRITER_SYSTEM_INSTRUCTION = `You are an expert editor. Your sole task is to rewrite text as a close, polished paraphrase that preserves the original content exactly — every idea, fact, name, number, and argument — while changing the wording and sentence construction throughout.

You never add new information, examples, opinions, or commentary. You never omit any point from the original. You only change how things are expressed, never what is expressed.

Respond with valid JSON only, in the shape the user's message specifies.`;

// ── Prompt builder ────────────────────────────────────────────────────────────
// Tone is accepted in the signature to satisfy the shared service interface but
// is intentionally not injected into the prompt — the prompt is already
// engineered for a formal academic register and an explicit tone instruction
// would undermine it.
function buildPrompt(text: string): string {
  return `You are an expert editor who rewrites essays into a slightly more formal, polished register while preserving their content exactly.

TASK
Rewrite the text below so it reads like a close, polished paraphrase of the original. Keep the same ideas, structure, and order, but change the wording and sentence construction throughout.

WHAT TO PRESERVE
- The same number of paragraphs, in the same order.
- Every idea, example, list item, and conclusion. Add nothing new and omit nothing.
- The overall length (within roughly ±5% of the original word count).
- The original meaning, facts, and argument.
- Any names, numbers, and technical terms (do not paraphrase these).

WHAT TO CHANGE
1. Vocabulary: Replace common words with more formal or elevated synonyms where natural.
   - essential -> vital; important benefits -> key advantages
   - helps -> fosters / enables / empowers
   - reduce -> alleviate; improve -> enhance / elevate
   - create -> foster / cultivate; shows -> demonstrates
   - Use words like "instrumental," "instilling," "crucial," "nurturing," and "prospects" where they fit.

2. Transitions: Swap the original's connectors for alternatives
   (Furthermore -> Additionally/Moreover; In addition -> Furthermore; Despite X -> However, there are...; Therefore -> Therefore/As a result).

3. Sentence structure: Restructure about half of the sentences. Change active/passive voice, reorder clauses, turn verbs into noun phrases (or the reverse), and open sentences differently (e.g., "Technology has changed..." -> "With the advent of technology, ...").

4. Hedging: Where the original makes flat, categorical statements about problems or risks, soften them with "may," "some," or "can" (e.g., "Students lack access to..." -> "Students may not have access to...").

5. Light compression: Where the original lists items in a long clause (e.g., "encourage their children, provide emotional support, and cooperate with teachers"), you may merge or tighten phrasing as long as no item is lost.

6. Conclusion: Rephrase the closing sentences (e.g., "investing in" -> "prioritizing"; "characterized by" -> "filled with") while keeping the same message.

WHAT TO AVOID
- Do not copy any sentence verbatim, except for very short stock phrases (e.g., "Every child deserves the opportunity to learn").
- Do not repeat the same elevated word more than three times in the whole text; vary your synonyms.
- Do not make the tone flowery, dramatic, or promotional. It should stay academic and clear.
- Do not add commentary, headings, bullet points, or explanations.

FORMATTING
- If the original title uses Markdown (e.g., "# Title"), output the title as plain text with no symbols.
- Output only the rewritten text. No preface, no notes.

SELF-CHECK (do silently before answering)
- Same paragraph count and order as the original?
- Every idea and example still present?
- No new claims introduced?
- Most sentences meaningfully reworded?

EXAMPLE
Input:
"# Education and Society
Education plays an essential role in society. Schools help students develop critical thinking skills. Despite its importance, students in some areas lack access to qualified teachers and proper resources. Therefore, investing in education is crucial for national development."

Output:
"Education and Society
Education plays a vital role in society. Schools enable students to develop critical thinking skills. However, there are challenges: in some regions, students may not have access to qualified teachers or adequate resources. As a result, prioritizing education is crucial for national development."

OUTPUT: Only valid JSON, in this shape:
{ "humanizedText": "<the rewritten text only>", "changes": ["<2 to 4 short notes on what was improved: vocabulary, transitions, sentence structure, or hedging>"] }

TEXT TO REWRITE:
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
   * Rewrites text using the engineered academic paraphrase prompt.
   * The `tone` parameter is accepted to satisfy the shared service interface
   * but is not injected into the prompt — the prompt's register is fixed.
   * The `language` parameter is similarly accepted but not used: the prompt
   * produces output in the same language as the input naturally.
   */
  static async rewrite(
    text: string,
    _tone: Tone,
    tier: HumanizerTier = "free",
    _language: SupportedLanguage = "auto",
  ): Promise<HumanizerResult> {
    const cfg = TIER_CONFIG[tier];
    const label = `gptzero-${tier}-tier rewrite`;

    const response = await generateContentWithRetry(
      {
        model: cfg.model,
        contents: buildPrompt(text),
        config: {
          systemInstruction: REWRITER_SYSTEM_INSTRUCTION,
          temperature: TEMPERATURE,
          responseMimeType: "application/json",
          responseSchema: humanizerSchema,
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
