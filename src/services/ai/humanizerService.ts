import { client, MODELS } from "./geminiClient";
import { getLanguagePromptLabel, type SupportedLanguage } from "@/lib/languages";

export type Tone =
  | "casual"
  | "professional"
  | "academic"
  | "formal"
  | "creative"
  | "friendly"
  | "storytelling"
  | "gptzero";

export type HumanizerTier = "free" | "basic" | "pro";

export interface HumanizerResult {
  humanizedText: string;
  changes: string[];
  fallback?: boolean;
}

type GenerateContentParams = Parameters<typeof client.models.generateContent>[0];

// ── Per-call timeouts (ms) ────────────────────────────────────────────────────
// Free:  30s  (2.5-flash, no thinking)
// Paid:  60s  (2.5-pro, no thinking)
const TIMEOUT_FREE_MS  = 30_000;
const TIMEOUT_PAID_MS  = 60_000;

const AI_RETRY_ATTEMPTS = 2;

// ── FIX 3: Rewrite temperature lowered (0.8 free / 0.92 paid → 0.65) ─────────
// The old comment claimed high temperature "maximises perplexity and burstiness",
// but temperature was a major source of meaning drift: at 0.92 the model freely
// swapped words, dropped qualifiers, and invented phrasing beyond the source.
// Perplexity/burstiness are now enforced by the explicit word-substitution and
// sentence-length targets in the prompt, so temperature no longer needs to do it.
const REWRITE_TEMPERATURE = 0.65;

// ── System instruction (processed once, not repeated per request) ────────────
// Kept separate from the user prompt to reduce per-request token count.
//
// FIX 2: Meaning preservation was previously the LAST line of the "REQUIRED"
// list — buried under ~15 lines of "change everything" instructions, so the
// model weighted it lowest. It is now the second sentence of the system
// instruction, framed as overriding every other rule. Instructions at the top
// of a prompt carry the most weight in long-context models.
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
- At least one sentence fragment. Like this.
- At least two sentences starting with: And, But, So, Because, Yet, or Or
- At least one parenthetical aside (like this one)
- At least one paragraph that is a single sentence
- Mid-sentence dash — used to break predictable syntax`;

// ── GPTZero tone: full standalone prompt ─────────────────────────────────────
// This tone uses its own complete system instruction and prompt builders that
// replace the standard bypass rules entirely. The prompt is designed to
// reproduce the writing style of an intermediate English learner, targeting
// GPTZero's detection patterns specifically.

const GPTZERO_SYSTEM_INSTRUCTION = `You are a writing-style transformation specialist. Your task is to rewrite any provided formal, polished, or academic-style text into a more conversational, straightforward, and moderately imperfect style of English.

The target style resembles an explanatory essay written by an intermediate English learner who can communicate ideas clearly but does not consistently demonstrate native-like grammatical accuracy, natural word combinations, or polished academic writing.

Your objective is to reproduce both the stylistic characteristics and the imperfections of this target writing style. Do not automatically correct every grammatical or punctuation issue. The imperfections are an intentional part of the requested style.

HIGHEST PRIORITY — CONTENT PRESERVATION: Preserve the original meaning, purpose, arguments, factual claims, examples, and conclusions. Do not invent information, statistics, research findings, or supporting evidence. Do not remove important information simply to make the text easier to rewrite. Maintain approximately the same level of detail and overall length. This rule overrides every other instruction.`;

const GPTZERO_TRANSFORMATION_RULES = `
## Overall Voice and Tone
Make the writing sound more conversational, explanatory, and accessible rather than highly formal, sophisticated, or academically polished. Use familiar vocabulary, straightforward expressions, and relatively simple explanations. Use inclusive expressions such as "we," "our society," "our lives," and "us" when appropriate. Maintain a generally serious, informative tone suitable for essays and explanatory texts. Do not make the writing extremely casual, slang-heavy, humorous, or incoherent.

## Vocabulary and Word Choice
Replace some formal, precise, or sophisticated expressions with more common vocabulary. Examples:
- "Technological developments" → "The progress of technology"
- "Regardless of geographical distance" → "No matter how far apart they are"
- "Individuals and communities" → "People and communities"
- "Significant contributions" → "Important benefits"
- "Consequently" → "As a result"
- "Must ensure" → "It's important to ensure"
- "Profoundly transformed" → "Significantly changed"
- "Utilize digital resources" → "Use digital resources"
Adapt these substitutions to meaning and context. Occasionally use a word or phrase that is understandable but slightly awkward, redundant, or less idiomatic. Mix natural expressions with occasional imperfect ones.

## Sentence Structure
Favor straightforward constructions with a mixture of simple and moderately complex sentences. Break up some long academic sentences into shorter statements. Allow a degree of repetition in subjects, verbs, and sentence openings. Avoid making every sentence equally short, equally long, or structurally identical.

## Transitions and Repetition
Use explicit transitions more frequently than polished academic writing would. Appropriate examples: "On the one hand ... On the other hand ...", "Additionally ...", "Moreover ...", "Furthermore ...", "In this context ...", "As a result ...", "Therefore ...", "Finally ...", "So ...". Sometimes use a transition that is slightly repetitive, predictable, or unnecessary.

## Deliberately Reproduce Imperfect Grammar and Punctuation
Introduce or retain occasional imperfections resembling those found in intermediate-level English writing:
- Occasional incorrect or unnatural article, preposition, or adjective construction (e.g., "not absolute good nor absolute bad" instead of "neither completely good nor completely bad")
- Occasionally understandable but unnatural word combinations (e.g., "rapid misinformation spread" instead of "the rapid spread of misinformation")
- Sometimes omit the serial comma before the final item in a list
- Allow occasional redundancy, duplicated emphasis, or slightly awkward coordination
- Occasionally use a sentence whose connection to the preceding sentence is understandable but less smooth than professional academic prose
- Allow some sentences to be grammatically sound while others contain minor imperfections

Use a low-to-moderate level of imperfection throughout. Include several noticeable but understandable imperfections in a typical medium-length essay. Vary the types of imperfections. Do not introduce spelling mistakes, destroy subject-verb agreement repeatedly, or make the writing difficult to understand.

## Paragraph Organization
Preserve the original text's overall purpose, central argument, key information, examples, and general paragraph sequence. Reproduce a somewhat more formulaic and predictable paragraph style. Topic sentences may follow familiar patterns such as "Another important area is..." or "One of the most significant benefits is...". For essay-type texts, maintain introduction, body paragraphs, and conclusion.

## Introductions and Conclusions
Make introductions direct and accessible. Use familiar opening expressions such as "Today," "In modern society," or "One of the most important..." when appropriate. Conclusions should restate the main idea and summarize important benefits and challenges. Use conventional concluding phrases such as "Finally," "In conclusion," or "So, we need to..." when suitable.

## Calibration
Do not produce perfectly polished academic writing. Also avoid making the result deliberately unintelligible, excessively ungrammatical, childish, or filled with random errors. The intended result is a realistic mixture of understandable English, familiar vocabulary, explicit transitions, occasional redundancy, some awkward expressions, and a limited number of genuine grammatical and punctuation problems.

Before writing your output, silently:
1. Identify the original text's key ideas, arguments, tone, and organization.
2. Replace much of its formal vocabulary with familiar and conversational expressions.
3. Reshape its sentences into a more straightforward and explanatory style.
4. Add natural but sometimes repetitive transitions and sentence openings.
5. Incorporate occasional plausible grammatical, collocational, and punctuation imperfections.
6. Check that the imperfections are distributed unevenly and do not obscure the intended meaning.
7. Verify that the resulting text resembles imperfect, intermediate-level English rather than either polished academic writing or deliberately broken English.`;

function buildGPTZeroPrompt(text: string, language: SupportedLanguage): string {
  const languageLabel = getLanguagePromptLabel(language);
  return `Rewrite the text below following the transformation rules provided in your system instructions exactly.

LANGUAGE: Write the final output in ${languageLabel}. If the requested language is the source language, keep the same language as the input. Preserve native idioms and punctuation conventions; do not force English sentence patterns onto non-English text.
${GPTZERO_TRANSFORMATION_RULES}

Text:
"""
${text}
"""

Return ONLY valid JSON: { "humanizedText": "...", "changes": ["change 1", "change 2", "change 3"] }
The changes array must describe the 3 most significant style transformations made.`;
}

// ── Tone-specific instruction blocks ─────────────────────────────────────────
const TONE_RULES: Record<Exclude<Tone, "gptzero">, string> = {
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
//
// FIX 2: MEANING PRESERVATION used to sit at the BOTTOM of this block, after
// all the "non-negotiable" burstiness/perplexity quotas — so the strongest
// change-things instructions were read last and weighted highest. It now comes
// first and is explicitly marked as overriding the targets below it.
const UNIVERSAL_BYPASS_RULES = `
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

SENTENCE STRUCTURE (required):
- At least one sentence fragment. Like this.
- At least two sentences starting with: And, But, So, Because, Yet, or Or.
- At least one parenthetical aside (something that feels genuinely incidental).
- At least one paragraph that is a single sentence.
`;

// ── Prompt builders ───────────────────────────────────────────────────────────

function buildFreePrompt(text: string, tone: Tone, language: SupportedLanguage): string {
  // GPTZero uses its own standalone prompt — guard against accidental use here
  if (tone === "gptzero") return buildGPTZeroPrompt(text, language);
  const languageLabel = getLanguagePromptLabel(language);
  return `You are an expert writing editor. Rewrite the text below so it reads as genuinely human-written while preserving all original meaning.

TONE: ${TONE_RULES[tone]}
LANGUAGE: Write the final output in ${languageLabel}. If the requested language is the source language, keep the same language as the input. Preserve native idioms and punctuation conventions; do not force English sentence patterns onto non-English text.
${UNIVERSAL_BYPASS_RULES}
Text:
"""
${text}
"""

Return ONLY valid JSON: { "humanizedText": "...", "changes": ["change 1", "change 2", "change 3"] }
The changes array must describe what you changed and why it reduces AI detection probability.`;
}

function buildPaidPrompt(text: string, tone: Tone, language: SupportedLanguage): string {
  // GPTZero uses its own standalone prompt — guard against accidental use here
  if (tone === "gptzero") return buildGPTZeroPrompt(text, language);
  const languageLabel = getLanguagePromptLabel(language);
  return `You are an expert writing editor and AI detection specialist. Rewrite the text below so it is completely undetectable by GPTZero, Turnitin, Originality.ai, Copyleaks, Winston AI, and ZeroGPT.

TONE: ${TONE_RULES[tone]}
LANGUAGE: Write the final output in ${languageLabel}. If the requested language is the source language, keep the same language as the input. Preserve native idioms and punctuation conventions; do not force English sentence patterns onto non-English text.
${UNIVERSAL_BYPASS_RULES}
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
    language: SupportedLanguage = "auto",
  ): Promise<HumanizerResult> {
    const model = tier === "free" || tier === "basic" ? MODELS.FREE : MODELS.PRO;

    // Single call — no chunking. Chunking re-enabled once Pro model latency is resolved.
    return tier === "free"
      ? this.rewriteFree(text, tone, model, language)
      : this.rewritePaid(text, tone, model, language);
  }

  // ── Free tier: single AI call ─────────────────────────────────────────────

  private static async rewriteFree(
    text: string,
    tone: Tone,
    model: string,
    language: SupportedLanguage,
  ): Promise<HumanizerResult> {
    try {
      const response = await generateContentWithRetry(
        {
          model,
          contents: buildFreePrompt(text, tone, language),
          config: {
            systemInstruction:
              tone === "gptzero"
                ? GPTZERO_SYSTEM_INSTRUCTION
                : HUMANIZER_SYSTEM_INSTRUCTION,
            temperature: REWRITE_TEMPERATURE,
            // Disable dynamic thinking — not needed for rewriting, adds latency.
            thinkingConfig: { thinkingBudget: 0 },
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
    language: SupportedLanguage,
  ): Promise<HumanizerResult> {
    try {
      const response = await generateContentWithRetry(
        {
          model,
          contents: buildPaidPrompt(text, tone, language),
          config: {
            systemInstruction:
              tone === "gptzero"
                ? GPTZERO_SYSTEM_INSTRUCTION
                : HUMANIZER_SYSTEM_INSTRUCTION,
            temperature: REWRITE_TEMPERATURE,
            // gemini-2.5-pro does not support thinkingBudget: 0 — thinking
            // cannot be fully disabled on Pro; leave thinkingConfig unset
            // so the model uses its default (low) thinking budget.
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
