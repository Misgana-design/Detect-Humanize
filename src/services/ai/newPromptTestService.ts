/**
 * TEST FILE — temporary prompt evaluation harness.
 * Delete this file and its references in route.ts, useHumanizer.ts,
 * and HumanizerPageClient.tsx once testing is complete.
 */

import { client, MODELS, humanizerSchema } from "./geminiClient";
import type { HumanizerTier, HumanizerResult } from "./humanizerService";

type GenerateContentParams = Parameters<
  typeof client.models.generateContent
>[0];

// ── Per-call timeouts (ms) ────────────────────────────────────────────────────
const TIMEOUT_FREE_MS = 30_000;
const TIMEOUT_PAID_MS = 60_000;

const AI_RETRY_ATTEMPTS = 2;

// Moderate temperature — enough variation to test natural phrasing without
// drifting into hallucination territory.
const TEMPERATURE = 0.6;

// ── Tier configuration ───────────────────────────────────────────────────────
const TIER_CONFIG: Record<
  HumanizerTier,
  { model: string; timeoutMs: number; disableThinking: boolean }
> = {
  free:  { model: MODELS.FREE, timeoutMs: TIMEOUT_FREE_MS, disableThinking: true  },
  basic: { model: MODELS.FREE, timeoutMs: TIMEOUT_PAID_MS, disableThinking: true  },
  pro:   { model: MODELS.PRO,  timeoutMs: TIMEOUT_PAID_MS, disableThinking: false },
};

// ── System instruction ───────────────────────────────────────────────────────
// Intentionally neutral — lets the prompt do all the work without
// the system instruction fighting or overriding its rules.
const TEST_SYSTEM_INSTRUCTION = `You are an AI writing assistant. Rewrite text exactly as the user's instructions specify. Preserve the original meaning completely. Respond with valid JSON only.`;

// ── Prompt builder ────────────────────────────────────────────────────────────
// Tone and language are accepted to satisfy the shared interface but are not
// injected — the prompt defines its own style rules.
function buildPrompt(text: string): string {
  return `You are an AI humanizer.
Your role is to rewrite AI-generated text so it sounds natural, human-like, and professional, while preserving its original meaning.

Guidelines:
• Use plain, everyday language. Avoid complex vocabulary, technical jargon, or abstract phrasing.
• Replace all transition words and conjunctions with the most basic and commonly used ones.
• Maintain smooth and logical connections between sentences.
• Every sentence should have a clear subject and express a single, focused idea.
  • When multiple points are closely related, group them naturally into one sentence instead of breaking them into fragments.
  • Avoid robotic, overly choppy structures like:
    • "These jobs include learning from experience. They can also spot patterns. They understand human language, solve problems, and make decisions."
    • Instead, rewrite as: "These tasks involve learning from experience and recognizing patterns. They also include understanding human language, solving problems, and making decisions."
• Use mostly short sentences, but mix in moderate-length ones to create a natural rhythm and improve flow.
• Avoid long or complex sentence structures.
• Vary sentence syntax to reflect how a human would naturally write or speak.
• Begin each paragraph with a clear point, followed by supporting details.
• Do not include conclusions, wrap-ups, or summaries. Let the text end naturally, as if part of an ongoing discussion.
• Avoid repetitive sentence patterns and phrasing. Keep the rhythm varied and dynamic.
• Use natural phrasing for examples.
  • For example, say "for example, apple, banana, and so on" instead of "Fruits: apple, banana, and more."
• Avoid colons (:) and semicolons (;).
  • Break ideas into separate sentences or use commas and conjunctions.
  • Example:
    • Original: "Three species are generally recognized: the African bush elephant, the African forest elephant, and the Asian elephant; each has unique physical characteristics and habitats."
    • Improved: "Three species are generally recognized. These are the African bush elephant, the African forest elephant, and the Asian elephant. Each has unique physical characteristics and habitats."
• Use active voice consistently.
• Occasionally include minor grammar quirks or natural imperfections (e.g., slight punctuation variations) to mimic human writing.
• Maintain high perplexity and burstiness to reflect human-like variation in sentence length and structure.
• Do not use questions — rhetorical or factual.
  • Avoid question marks and phrases like "what if," "can you imagine," or "do you think."
• Do not use dashes.
  • Replace dashes with commas, periods, or rewrite the sentence for clarity.
• Only return the rewritten, humanized version of the text.
• Do not include any formatting, explanations, or extra commentary.

Text:
"""
${text}
"""

Return ONLY valid JSON: { "humanizedText": "...", "changes": ["change 1", "change 2", "change 3"] }
The changes array must describe what you changed and why it makes the text sound more human.`;
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
        `[new-prompt-test] ${label} attempt ${attempt}/${AI_RETRY_ATTEMPTS} failed:`,
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

// ── Main service ──────────────────────────────────────────────────────────────

export class NewPromptTestService {
  /**
   * TEST ONLY — routes through the candidate prompt for evaluation.
   * `tone` and `language` are accepted to satisfy the shared interface
   * but are not used — the prompt defines its own style rules.
   */
  static async rewrite(
    text: string,
    tier: HumanizerTier = "free",
  ): Promise<HumanizerResult> {
    const cfg = TIER_CONFIG[tier];
    const label = `new-prompt-test-${tier}`;

    const response = await generateContentWithRetry(
      {
        model: cfg.model,
        contents: buildPrompt(text),
        config: {
          systemInstruction: TEST_SYSTEM_INSTRUCTION,
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
}
