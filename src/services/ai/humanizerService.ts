import { client, MODELS, humanizerSchema } from "./geminiClient";
import type { SupportedLanguage } from "@/lib/languages";
import type { Tone, HumanizerTier, HumanizerResult } from "./humanizerTypes";

// Re-export so any existing import of these types from humanizerService
// continues to work without changes.
export type { Tone, HumanizerTier, HumanizerResult };

type GenerateContentParams = Parameters<
  typeof client.models.generateContent
>[0];

// ── Per-call timeouts (ms) ────────────────────────────────────────────────────
// Free:  30s  (gemini-2.5-flash)
// Paid:  60s  (gemini-2.5-pro)
const TIMEOUT_FREE_MS = 30_000;
const TIMEOUT_PAID_MS = 60_000;

const AI_RETRY_ATTEMPTS = 2;

// Moderate temperature — lets the prompt's synonym and structure rules drive
// variation without risking factual drift.
const TEMPERATURE = 0.6;

// ── Tier configuration ───────────────────────────────────────────────────────
// Model, timeout, and thinking behaviour chosen together so the tier mapping
// lives in one place.
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
// Intentionally neutral — lets the prompt's own rules do all the work without
// the system instruction overriding or contradicting them.
const HUMANIZER_SYSTEM_INSTRUCTION = `You are a text rewriting engine. Follow the user's rewriting rules exactly. Preserve the original meaning completely. Respond with valid JSON only.`;

// ── Prompt builder ────────────────────────────────────────────────────────────
// Language is accepted to satisfy the shared call-site interface but is not
// injected — the prompt inherits the source language naturally.
function buildPrompt(text: string, tone: Tone): string {
  return `You are a text rewriting engine. Rewrite the input text in a specific "heavy paraphrase" style, following the rules below exactly. Output only the rewritten text.

TONE: ${tone}

## STYLE RULES

1. PASSIVE AND INVERTED STRUCTURE

Convert most active sentences to passive voice, or put the action or result first and the doer last (or drop the doer).

- "Students study different subjects" → "Distinct academic fields are learned by pupils"
- "Technology has transformed education" → "Transformation in educational institutions has occurred through technology"

Aim for roughly 70-80% of sentences to be passive or inverted. Vary the rest with noun-first openers such as "Gaining knowledge stands as...", "Economic progress is heavily guided by...".

2. SYNONYM SWAPS (literal, descriptive, slightly unusual)

Replace common words with longer or more descriptive equivalents, for example:

- smartphones → portable telephones / pocket phones
- email → electronic letters
- social media → social networks
- video conferencing → screen meeting programs
- students → pupils / learners / knowledge seekers
- teachers → instructors
- classrooms → study rooms / instructional rooms
- textbooks → reading books
- computers → computing devices
- jobs/employment → working positions
- businesses → trade organizations
- developing countries → growing nations
- misinformation → untrue rumors
- privacy → secret personal knowledge
- inequality → unfairness
- benefit → blessing / gift
- society/community → localities / communal life
- important → vital / essential / of great necessity

Apply the same logic to any other common word: pick a longer, more literal or descriptive alternative. Do not reuse the same replacement every time; vary it.

3. ATTRIBUTION AND HEDGING PHRASES

Insert one vague authority opener in roughly every second or third paragraph, and sometimes mid-paragraph. Rotate among:

"Many people believe that...", "Experts claim that...", "It has been observed that...", "Scholars state that...", "Researchers suggest that..."

Attach them to plain factual statements, even where they are not logically needed. Never use the same one twice in a row.

4. TRANSITIONS AND OPENERS

- Remove or replace "Furthermore", "However", "In conclusion", "Additionally", "Moreover".
- "As a result" → "Consequently"
- "Therefore" → "For this reason" / "Because of these conditions"
- "Despite X, Y" → "Y is encountered, even though X"
- Do not open paragraphs with generic transitions. Open with the topic as a noun phrase.

5. ABSTRACT, NOMINALIZED PHRASING

Prefer noun-heavy constructions over plain verbs: "stands as a primary blessing", "holds great necessity", "remains vital", "is heavily guided by".

6. TEXTURE

Allow slightly formal, slightly stiff collocations. Do not polish the text into natural, fluent prose. Occasionally use a mildly redundant phrase.

## HARD CONSTRAINTS

- Keep headings exactly as they are.
- Keep the same number of paragraphs, in the same order.
- Keep the original meaning and order of ideas. Do not add new facts, examples, or opinions.
- Keep roughly the same length as the original (within ±10%).
- Formal register only: no contractions, no first or second person, no slang, no emojis.
- Do not add commentary, notes, explanations, or a preamble. If the input ends mid-sentence, end the output the same way.

## EXAMPLE

Original:
"Students can access enormous amounts of information through the internet, digital libraries, and online courses."

Rewritten:
"Knowledge seekers gather abundant information through the network of computers, digital book collections, and distance lessons."

## INPUT TEXT

<text>
${text}
</text>

Return ONLY valid JSON: { "humanizedText": "...", "changes": ["change 1", "change 2", "change 3"] }
The changes array must describe what was changed and why it makes the text harder to detect as AI-written.`;
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
// With responseMimeType: "application/json" the SDK returns clean JSON, so this
// is a thin type-check guard.
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

// ── Meaning check (log-only) ─────────────────────────────────────────────────
// Warns when numbers, quoted passages or multi-word proper nouns from the input
// are absent from the output. A warning, not a rejection — legitimate edits may
// express "1,000" as "a thousand".
function checkMeaningPreservation(
  input: string,
  output: string,
  label: string,
): void {
  const numbers = input.match(/\b\d[\d,]*(?:\.\d+)?\b/g) ?? [];
  const missingNumbers = numbers.filter(
    (n) => !output.includes(n) && !output.includes(n.replace(/,/g, "")),
  );

  const quoted = [...input.matchAll(/[""]([^""\n]{4,})[""]/g)].map((m) => m[1]);
  const missingQuotes = quoted.filter((q) => !output.includes(q));

  const properNouns = input.match(/(?:[A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)/g) ?? [];
  const missingNouns = properNouns.filter((p) => !output.includes(p));

  const missing = [...missingNumbers, ...missingQuotes, ...missingNouns];
  if (missing.length > 0) {
    console.warn(
      `[humanizer] ${label} meaning check — possibly missing from output:`,
      missing,
    );
  }
}

// ── Main service ──────────────────────────────────────────────────────────────

export class HumanizerService {
  /**
   * Rewrites text using the heavy-paraphrase prompt.
   * `language` is accepted to satisfy the shared call-site interface but is
   * not injected into the prompt — the model inherits the source language.
   */
  static async rewrite(
    text: string,
    tone: Tone,
    tier: HumanizerTier = "free",
    _language: SupportedLanguage = "auto",
  ): Promise<HumanizerResult> {
    const cfg = TIER_CONFIG[tier];
    const label = `${tier}-tier rewrite`;

    const response = await generateContentWithRetry(
      {
        model: cfg.model,
        contents: buildPrompt(text, tone),
        config: {
          systemInstruction: HUMANIZER_SYSTEM_INSTRUCTION,
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

    const result = parseHumanizerResult(response.text, label);
    checkMeaningPreservation(text, result.humanizedText, label);
    return result;
  }
}
