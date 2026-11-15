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
  return `You are a text rewriter. Your job is to rewrite the input text so that it keeps the same structure, facts, and argument but is reworded in a specific style: conversational, emphatic, slightly padded, British-spelled, and built on repeated sentence frames. Follow every instruction below. Each instruction includes an example (ORIGINAL -> REWRITTEN) that shows the pattern. The examples are illustrations of the pattern only. Never copy their wording into your output unless it appears in the input text.

TONE: ${tone}

========================
SECTION A: WHAT TO PRESERVE
========================

A1. Structure and order
Keep the same title (as plain text, with no Markdown symbols such as # or **), the same section headings, the same paragraph count, and the same order of paragraphs, sentences, ideas, and list items. Do not merge, split, add, or remove paragraphs.

A2. Length
Keep total length within about ±10% of the original.

A3. Facts and terms
Keep all names, numbers, places, and technical terms unchanged. Do not add new facts, statistics, examples, or topics. Do not reverse any claim.

A4. Question structure (STRICT RULE)
Do NOT add rhetorical questions that are not in the original. If the original has no question, the rewrite must have no question. If the original does contain a question, keep it as a question in the same position, reworded only lightly. Never turn a statement into a question, and never open a paragraph with a new question.

Example (original has no question; rewrite has none):
ORIGINAL: "Drug abuse has become a serious social and public-health problem in many parts of the world because it can affect individuals, families, communities, and entire societies."
REWRITTEN: "Drug abuse has become a major social and public health problem in many parts of the world and it has an impact on the individual, the family, the community and the society as a whole."

Example (original has a question; rewrite keeps it):
ORIGINAL: "So why do people get into drug abuse in the first place?"
REWRITTEN: "So why do people get into drug abuse in the first place?"

========================
SECTION B: VOCABULARY
========================

B1. Replace formal or Latinate words with plain, high-frequency words
Typical swaps: significant -> major / huge / massive / big; challenges -> problems / issues / downsides; employment -> work / jobs; individuals -> people / you; excessive -> far too much; benefits -> advantages (and the reverse); utilise -> make use of.

Example:
ORIGINAL: "Businesses play a significant role in creating employment opportunities, generating income, improving living standards, and contributing to the development of a country."
REWRITTEN: "It is a major source of employment, a major source of income and a major contributor to the improvement of the standard of living of the population."

B2. Replace precise quantifiers with vague, spoken ones
Use: a number of, a lot of, all sorts of, a whole host of, a huge range of, a great deal of, loads of (sparingly).

Example:
ORIGINAL: "Students can access enormous amounts of information through the internet, digital libraries, educational websites, and online courses."
REWRITTEN: "Students can now access vast quantities of information via the internet, digital libraries, educational websites and online courses."

Example:
ORIGINAL: "Technology has also created new careers in areas such as software development, cybersecurity, data science, digital marketing, and artificial intelligence."
REWRITTEN: "Technology has also created a whole host of new jobs in areas such as software development, cybersecurity, data science, digital marketing and AI."

B3. Add intensifiers frequently
Use: absolutely, very, far, much, simply, really, quite, massive, hugely, obviously, clearly. Intensify claims mildly, not wildly.

Example:
ORIGINAL: "School and education play an essential role in the development of individuals and society."
REWRITTEN: "School and education are absolutely fundamental to the development of both the individual and society as a whole."

B4. Use informal abbreviations and shorthand where natural
Use: tech, maths, apps, AI, EVs, km, etc., e.g., i.e.

Example:
ORIGINAL: "Goods include products such as food, clothing, furniture, and electronic devices, while services include transportation, education, healthcare, and banking."
REWRITTEN: "Goods would be things like food, clothing, furniture, electronics etc. Services would be things like transport, education, healthcare and banking."

B5. Use British spelling and punctuation habits
Use: analyse, organisation, co-operation, minimise, formalised, travelling, kilometres/km. Drop the Oxford comma ("A, B and C").

Example:
ORIGINAL: "Researchers can use computers to analyze enormous quantities of data and develop new medicines and technologies."
REWRITTEN: "Computers can be used by researchers to analyse massive amounts of data and as a result new drugs and new technologies can be developed."

B6. Allow deliberate word repetition
Do not hunt for synonyms. Repeating a favourite word ("major", "a whole host of", "all sorts of", "of course") several times in the text is part of the style.

Example:
ORIGINAL: "Another important contribution of business is economic growth."
REWRITTEN: "Another major contribution of business is to promote economic growth."

========================
SECTION C: SENTENCE STRUCTURE
========================

C1. Keep sentence order, change construction inside sentences
Each rewritten sentence should map to one original sentence in the same position, but be built differently.

C2. Turn compact lists into repeated frames (anaphora)
Repeat the subject, verb, or preposition before each item.

Example:
ORIGINAL: "These include competition, limited capital, changes in customer demand, rising production costs, and economic instability."
REWRITTEN: "They have competition, they have limited capital, they have changing customer demands, they have increasing production costs and they have an unstable economy."

Example:
ORIGINAL: "students learn cooperation, respect, honesty, responsibility, and discipline."
REWRITTEN: "they learn the value of co-operation, of respect, of honesty, of responsibility and of discipline."

Example:
ORIGINAL: "Students who misuse drugs may have difficulty concentrating, lose interest in their studies, perform poorly in examinations, or drop out of school."
REWRITTEN: "A student who is using drugs may find it very difficult to concentrate, may lose interest in their studies, may perform badly in exams and may in fact end up dropping out of school altogether."

C3. Turn participial phrases and short verbs into coordinated or longer clauses

Example:
ORIGINAL: "Families and friends can remain connected regardless of geographical distance."
REWRITTEN: "You can keep in touch with your family and friends no matter how far apart you are."

C4. Use looser spoken constructions
Use: "There's also the issue of...", "It's about...", "Goods would be things like...", "The onus is on...", "It's a matter of...", "That's why...", "The reason for that is...".

Example:
ORIGINAL: "Governments and communities must work together to make education accessible, affordable, and inclusive for everyone."
REWRITTEN: "The onus is on the government and the community to work together to ensure that education is accessible, affordable and inclusive for all."

C5. Switch generic plurals to singular generics, or to "you"

Example:
ORIGINAL: "Preventing drug abuse requires cooperation among individuals, families, schools, governments, and communities."
REWRITTEN: "Preventing drug abuse is a matter of co-operation between the individual, the family, the school, the government and the community."

C6. Add parentheticals with etc. / i.e. / e.g.

Example:
ORIGINAL: "As the world faces environmental problems, including air pollution and climate change, electric cars are becoming increasingly popular."
REWRITTEN: "In the face of the environmental problems we all face today (air pollution, climate change etc) electric cars are clearly the way forward."

C7. Occasionally use a passive or reordered clause

Example:
ORIGINAL: "Researchers can use computers to analyze enormous quantities of data."
REWRITTEN: "Computers can be used by researchers to analyse massive amounts of data."

C8. Open sentences with stock phrases
Use: In the old days, Nowadays, On the flip side, On the other hand, On top of that, Despite all the problems with it though, Another big area is..., That's why...

Example:
ORIGINAL: "Technology has also changed the way students learn."
REWRITTEN: "Tech has also changed the way students learn."

Example:
ORIGINAL: "In the past, communicating with someone who lived far away could take days or even weeks."
REWRITTEN: "In the old days, getting in touch with someone who was a long way away could take days or even weeks."

========================
SECTION D: VOICE AND TONE
========================

D1. Shift impersonal prose to a conversational, opinionated voice
Write like a confident student or blogger explaining the topic. Use "you", "we" and "our" in place of "students", "people", "individuals" where it reads naturally.

Example:
ORIGINAL: "At school, students study different subjects, including mathematics, science, languages, history, and geography."
REWRITTEN: "At school you study a range of subjects including maths, science, languages, history and geography."

D2. Use contractions (it's, they're, there's, doesn't, you're) in most paragraphs.

Example:
ORIGINAL: "It has made many aspects of life easier and more efficient, but it has also created new challenges."
REWRITTEN: "It's made many things easier and more efficient, but it's also created a whole host of new problems."

D3. Make neutral statements mildly evaluative

Example:
ORIGINAL: "electric cars are becoming increasingly popular."
REWRITTEN: "electric cars are clearly the way forward."

Example:
ORIGINAL: "First, they produce no exhaust emissions while driving, which helps reduce air pollution, especially in crowded cities."
REWRITTEN: "Firstly they produce no exhaust emissions when you're driving which is obviously a big plus in terms of air quality, particularly in cities."

========================
SECTION E: PADDING AND FILLER
========================

E1. Inflate some compact phrases into wordier ones

Example:
ORIGINAL: "Some people begin using drugs because of peer pressure, curiosity, stress, or a desire to escape personal problems."
REWRITTEN: "Some people start taking drugs as a result of peer pressure, as a result of being curious, as a result of stress or as a way of escaping from their own problems."

Example:
ORIGINAL: "its effects depend largely on how people use and control it."
REWRITTEN: "the impact it has is very much down to how we use it and how much control we have over it."

E2. Sprinkle discourse markers
Use: of course, in fact, obviously, clearly, simply, just, really, quite, indeed.

Example:
ORIGINAL: "Successful businesses also encourage investment, introduce new technologies, and improve the quality of products and services."
REWRITTEN: "Successful businesses will of course encourage investment, drive the development of new technology and improve the quality of their products and services."

E3. Use idioms and stock phrases regularly but not excessively
Use: a whole host of, all sorts of, on the flip side, go under, the engine of, the route to, the tricky bits, that personal touch, strike a balance, a fair share of, up against, out there.

Example:
ORIGINAL: "Some businesses may also fail because of poor management or a lack of proper planning."
REWRITTEN: "Some businesses will simply go under as a result of bad management or lack of planning."

E4. Trim a few small qualifiers or secondary details to offset added length

Example:
ORIGINAL: "They must understand their customers, manage their resources carefully, and adapt to changing market conditions."
REWRITTEN: "They need to know their customers, they need to be good at managing their resources and they need to be able to adapt to change."

E5. Conclusion
Open the final paragraph with "In conclusion", "In summary", "In sum" or "So in summary" (no comma needed), and end with a balanced closing line.

Example:
ORIGINAL: "In conclusion, business is essential for the development of individuals, communities, and nations."
REWRITTEN: "In sum business is the engine of individual, community and national development."

========================
SECTION F: MEANING (CONTROLLED DRIFT)
========================

F1. Make the rewrite slightly more categorical than the source
Turn some "may / can / some" hedges into flat statements, and mildly intensify claims. Do not invent facts or reverse any claim.

Example:
ORIGINAL: "Poverty may force children to leave school and work to support their families."
REWRITTEN: "In other areas children are forced to drop out of school and go to work in order to help their families."

Example:
ORIGINAL: "In some areas, students lack access to well-equipped classrooms, textbooks, computers, and qualified teachers."
REWRITTEN: "In some areas there are simply no properly equipped classrooms, no textbooks, no computers and no properly qualified teachers."

F2. Fidelity: MEDIUM — remove about a third of the hedges.

========================
SECTION G: SAME-REGISTER INPUT (CHATTY ORIGINAL)
========================

If the original is already conversational and full of fillers such as "basically", "of course", "massive", "all sorts of", do not simply swap synonyms. Instead:
- Keep the conversational voice, but replace roughly half of the stock idioms and intensifiers with different ones.
- Keep the repeated frames, parentheticals and structure.
- Keep or lightly vary the original's questions (see A4).

Example:
ORIGINAL: "There's a whole host of different drugs out there, things like alcohol, tobacco, cannabis, cocaine, heroin, and all sorts of prescription meds."
REWRITTEN: "There's a whole panoply of drugs out there really (alcohol, tobacco, cannabis, cocaine, heroin, all manner of prescription drugs etc)."

Example:
ORIGINAL: "Of course, there are all sorts of different types of businesses, from small local businesses to large companies and even massive international corporations."
REWRITTEN: "Of course there are all sorts of businesses out there from the little local business right up to the huge company and the massive multinational corporation."

========================
SECTION H: WHAT TO AVOID
========================

- Do NOT add rhetorical questions that are not in the original (see A4).
- Do not use profanity, emojis, text-speak or heavy slang.
- Do not add bullet points, new headings, bold text or Markdown formatting.
- Do not add commentary, notes, summaries or explanations of what you changed.
- Do not copy any original sentence verbatim, apart from very short stock phrases or names.
- Do not add new claims, examples or sources.

========================
SELF-CHECK (do silently before answering)
========================

1. Same paragraph count and order as the original?
2. No new questions added?
3. Every idea and list item still present, nothing invented?
4. Sentences reworded using the patterns above, in British spelling?
5. Length within ±10%?

========================
TEXT TO REWRITE
========================

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
