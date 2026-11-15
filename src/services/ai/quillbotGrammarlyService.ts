import { streamText } from "ai";
import { vertex } from "./vertexProvider";
import { client, MODELS, humanizerSchema } from "./geminiClient";
import type { SupportedLanguage } from "@/lib/languages";
import type { Tone, HumanizerTier, HumanizerResult } from "./humanizerTypes";

type GenerateContentParams = Parameters<
  typeof client.models.generateContent
>[0];

// ── Per-call timeouts (ms) ────────────────────────────────────────────────────
const TIMEOUT_FREE_MS = 30_000;
const TIMEOUT_PAID_MS = 60_000;

const AI_RETRY_ATTEMPTS = 2;

const TEMPERATURE = 0.7;

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
// Neutral — the prompt carries all the style rules. The JSON variant asks for
// JSON; the streaming variant asks for plain text.
const SYSTEM_INSTRUCTION = `You are a text rewriting engine. Follow the user's rewriting rules exactly. Preserve the original meaning completely. Respond with valid JSON only.`;

const STREAMING_SYSTEM_INSTRUCTION = `You are a text rewriting engine. Follow the user's rewriting rules exactly. Preserve the original meaning completely. Output only the rewritten text as plain text. Do not use JSON, markdown, or any other markup.`;

// ── Prompt builder ────────────────────────────────────────────────────────────
// Shared body — identical for JSON and streaming variants.
function buildPromptBody(text: string, tone: Tone): string {
  return `You are a rewriter who converts polished, textbook-style essays into a chatty, conversational, student-essay or blog voice. Rewrite the text below so it keeps the same structure and facts but sounds like a real person explaining the topic in a relaxed, slightly emphatic, spoken style.

TONE: ${tone}

PRESERVE

- The same paragraph count and order. Keep the title (plain text, no Markdown symbols) and any section headings.
- The same overall sequence of ideas, examples, and list items.
- Total length within about ±15% of the original.
- Names, numbers, and technical terms.
- Do not add new topics, statistics, or sources.

VOICE AND TONE

- Shift from impersonal academic prose to a conversational, opinionated voice.
- Use "you" and "we/our" where the original uses "students," "people," or "individuals" (e.g., "students learn" -> "you learn").
- Use contractions (it's, they're, there's, doesn't) in most paragraphs.
- Make neutral statements a bit evaluative: "is becoming popular" -> "is clearly the way forward"; "an advantage" -> "obviously a big plus".

VOCABULARY

- Replace formal words with plain, high-frequency ones: significant -> major/huge/big; challenges -> problems/issues/downsides; employment -> work/jobs; individuals -> people; excessive -> far too much; utilize -> make use of.
- Replace precise quantifiers with vague ones: a number of, a lot of, all sorts of, a whole host of, a huge range of.
- Add intensifiers often: absolutely, very, far, much, simply, really, quite, massive.
- Use informal abbreviations where natural: tech, maths, apps, AI, EVs, km, etc., e.g., i.e.
- Use British spelling throughout (analyse, organisation, co-operation, minimise, travelling).
- Repeating a favorite word (like "major" or "a whole host of") a few times is fine and part of the style.

SENTENCE STRUCTURE

- Keep the sentence order roughly the same, but change the construction inside sentences.
- Turn compact lists into repeated frames: "no textbooks, no computers and no teachers"; "they have competition, they have limited capital, they have..."; "of respect, of honesty, of responsibility".
- Turn participial phrases into coordinated clauses ("making cooperation easier" -> "it's also much easier for...").
- Use looser constructions: "There's also the issue of...", "It's about...", "Goods would be things like...", "The onus is on...".
- Add parentheticals with (etc), (i.e. ...), (e.g. ...).
- Occasionally use passive or reordered clauses ("Researchers can use computers" -> "Computers can be used by researchers").
- Start sentences with stock phrases: "In the old days," "On the flip side," "Despite all the problems with it though," "Another big area is..."

PADDING AND FILLER

- Inflate some compact phrasing into wordier forms: "because of curiosity" -> "as a result of being curious"; "depends on" -> "is very much down to"; "cooperate" -> "work in partnership".
- Sprinkle discourse markers: of course, in fact, obviously, clearly, simply, just, really, quite.
- Use idioms and clichés sparingly but regularly: a whole host of, all sorts of, on the flip side, go under, the engine of, the route to, the tricky bits, that personal touch, strike a balance.
- Trim a few small qualifiers or secondary details to offset the added length.
- Open the conclusion with "In conclusion," "In summary," "In sum," or "So in summary," and end with a punchy balanced closing line.

MEANING (CONTROLLED DRIFT)

- The rewrite should tend to sound a little more categorical than the source: turn some "may/can/some" hedges into flat statements, and mildly intensify claims ("lack access" -> "there are simply no properly equipped classrooms").
- Do not change the core argument, reverse any claim, or invent facts. Intensify the tone, not the content.
- FIDELITY: MEDIUM — remove about a third of hedges.

AVOID

- Slang, profanity, emojis, or text-speak.
- Bullet points or new headings.
- Commentary, explanations, or notes about what you changed.

TEXT TO REWRITE:

"""
${text}
"""`;
}

function buildPrompt(text: string, tone: Tone): string {
  return `${buildPromptBody(text, tone)}

Return ONLY valid JSON: { "humanizedText": "...", "changes": ["change 1", "change 2", "change 3"] }
The changes array must describe what was changed and why it makes the text sound more naturally human-written.`;
}

function buildStreamingPrompt(text: string, tone: Tone): string {
  return `${buildPromptBody(text, tone)}

Output ONLY the rewritten text as plain text. Do not wrap it in JSON or markdown and do not add any commentary.`;
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
        `[qb-grammarly] ${label} attempt ${attempt}/${AI_RETRY_ATTEMPTS} failed:`,
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
function parseResult(
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

// ── Main service ──────────────────────────────────────────────────────────────

export class QuillbotGrammarlyService {
  /**
   * Non-streaming rewrite — used for cache hits and the batch route.
   * `language` is accepted to satisfy the shared call-site interface but is
   * not injected; the model inherits the source language naturally.
   */
  static async rewrite(
    text: string,
    tone: Tone,
    tier: HumanizerTier = "free",
    _language: SupportedLanguage = "auto",
  ): Promise<HumanizerResult> {
    const cfg = TIER_CONFIG[tier];
    const label = `qb-grammarly-${tier}-tier rewrite`;

    const response = await generateContentWithRetry(
      {
        model: cfg.model,
        contents: buildPrompt(text, tone),
        config: {
          systemInstruction: SYSTEM_INSTRUCTION,
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

    return parseResult(response.text, label);
  }

  /**
   * Streaming variant — tokens are forwarded to the browser as they arrive.
   * onFinish runs server-side after the last token for persistence.
   */
  static rewriteStream(
    text: string,
    tone: Tone,
    tier: HumanizerTier = "free",
    onFinish?: (humanizedText: string) => Promise<void> | void,
  ) {
    const cfg = TIER_CONFIG[tier];

    return streamText({
      model: vertex(cfg.model),
      system: STREAMING_SYSTEM_INSTRUCTION,
      prompt: buildStreamingPrompt(text, tone),
      temperature: TEMPERATURE,
      onFinish: async ({ text: humanizedText }) => {
        if (!humanizedText.trim()) {
          throw new Error("AI returned an empty humanization response.");
        }
        if (onFinish) await onFinish(humanizedText);
      },
    });
  }
}
