import { streamText } from "ai";
import { vertex } from "./vertexProvider";
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

// Streaming variant — must NOT mention JSON, otherwise the model wraps the
// output in a JSON envelope despite the user prompt asking for plain text.
// The system instruction takes precedence, so it must explicitly request
// plain text.
const HUMANIZER_STREAMING_SYSTEM_INSTRUCTION = `You are a text rewriting engine. Follow the user's rewriting rules exactly. Preserve the original meaning completely. Output only the rewritten text as plain text. Do not use JSON, markdown, or any other markup.`;

// ── Tone modifiers ────────────────────────────────────────────────────────────
// Each entry overrides Section D (voice and tone) of the base prompt while
// leaving the structural rules (A–C, E–G) unchanged.
const TONE_INSTRUCTIONS: Record<Tone, string> = {
  standard: `\
TONE: STANDARD
Apply the base clinical, impersonal style described above with no extra adjustments.
Third person only. No contractions.`,

  casual: `\
TONE: CASUAL
Relax the clinical register slightly. Short sentences are fine. Use everyday vocabulary
where it doesn't sacrifice clarity, but keep third person and avoid slang or contractions.
Connectors like "Also," and "Because of this," are acceptable alongside the formal ones.`,

  professional: `\
TONE: PROFESSIONAL
Maintain the impersonal clinical style but optimise it for a business or corporate audience.
Favour active voice where it sounds decisive: "The analysis confirms..." rather than
"It is confirmed by the analysis...". Use precise business vocabulary: "stakeholders",
"deliverables", "strategic priorities". No first person, no contractions.`,

  academic: `\
TONE: ACADEMIC
Push the clinical register to its maximum. Maximise nominalisation, hedging with
"may", "suggests", "is indicative of", and attribution phrases ("Research indicates
that...", "Evidence suggests..."). Use discipline-neutral academic vocabulary.
Passive voice preferred. No personal pronouns, no contractions.`,

  formal: `\
TONE: FORMAL
Follow the base clinical style strictly. All sentences must be complete and grammatically
orthodox. Prefer longer, structurally balanced constructions. Avoid any colloquial
phrasing. No contractions, no first or second person.`,

  creative: `\
TONE: CREATIVE
Keep the same facts and structure, but allow varied sentence rhythm: short sentences
after long ones, occasional em-dashes for emphasis, and vivid concrete nouns instead
of abstract ones where possible. The rewrite should feel polished and readable, not
dry. Third person only; no contractions.`,

  friendly: `\
TONE: FRIENDLY
Lighten the register. Use warm, approachable vocabulary while staying in third person.
Short to medium sentences. Connectors like "In addition," and "As a result," are fine.
Avoid heavy nominalisation — prefer clear verb phrases over abstract noun stacks.
No contractions, no slang.`,

  storytelling: `\
TONE: STORYTELLING
Rewrite with narrative flow. Each paragraph should read like a step in a developing
account: set context, introduce tension or consequence, resolve. Use specific nouns
and active-voice verbs to drive momentum. Vary sentence length for rhythm.
Third person only; no contractions; no invented characters or dialogue.`,
};

// ── Prompt builder ────────────────────────────────────────────────────────────
// ─────────────────────────────────────────────────────────────────────────────
// TWO PROMPTS ARE AVAILABLE. To switch, change ACTIVE_PROMPT to "v1" or "v2".
//
//   "v1" — original prompt: clinical, noun-heavy, formal-report style.
//           Uses tone adjustment via TONE_INSTRUCTIONS.
//
//   "v2" — new prompt (test): plain, clipped, school-report style.
//           Shortens text 10-35%, removes hedging, prefers noun-phrase openers.
//           Tone parameter is accepted but silently ignored.
//
// ─────────────────────────────────────────────────────────────────────────────
const ACTIVE_PROMPT: "v1" | "v2" = "v2";
// ─────────────────────────────────────────────────────────────────────────────

// ── PROMPT V1 (original — keep intact for easy revert) ───────────────────────
function PROMPT_V1_buildPromptBody(text: string, tone: Tone): string {
  return `You are a text rewriter. Rewrite the input text so that it keeps the same structure, facts, and argument but sounds more clinical, impersonal, and noun-heavy, like a formal report or policy document. The main techniques are rotating synonyms, turning verbs and clauses into abstract noun phrases, reordering clauses, and removing any personal voice.

Each instruction below has an example (ORIGINAL -> REWRITTEN). The examples only illustrate the pattern. Never copy their wording into your output unless it appears in the input text. The example topic is drugs, but the patterns apply to any subject.

========================

TONE ADJUSTMENT

========================

${TONE_INSTRUCTIONS[tone]}

========================

SECTION A: WHAT TO PRESERVE

========================

A1. Structure and order

Keep the same paragraph count and the same order of paragraphs, sentences, ideas, and list items. Each rewritten sentence should map to one original sentence in the same position. Do not merge or remove paragraphs. Splitting a sentence in two is allowed (see C4). Keep section headings if the original has them.

A2. Length

Keep total length within about ±10% of the original.

A3. Facts and terms

Keep names, numbers, places, and technical terms unchanged. Do not add new topics, statistics, or sources. Do not reverse any claim.

A4. Questions (STRICT RULE)

Do NOT add rhetorical questions. If the original has no question, the rewrite has none. If the original contains a question, keep it as a question in the same position, reworded only lightly. Never turn a statement into a question.

Example (no question in the original, none in the rewrite):

ORIGINAL: "The causes of drug abuse are complex."

REWRITTEN: "The causes of substance abuse are numerous."

A5. Accuracy of rotated terms

When you swap a word for a synonym, the new word must not be narrower or broader in meaning than the old one. Do not turn "misused" into "illegally used", for example, because misuse also covers legal items such as prescriptions.

========================

SECTION B: VOCABULARY

========================

B1. Rotate synonyms for the topic noun

Do not repeat the main noun the way the original does. Give it a different label each time it recurs (drugs / substances / materials; misuse / abuse / use; people / individuals / persons). Keep each label faithful to the original meaning (see A5).

Example:

ORIGINAL: "Drugs are substances that can affect the physical and mental functions of the human body."

REWRITTEN: "Drugs are materials that can affect the body's physical and mental processes."

Example:

ORIGINAL: "Drug abuse has become a serious social and public-health problem in many parts of the world..."

REWRITTEN: "...drug use is now a major social problem and a public health issue in many areas of the world."

B2. Replace everyday verbs and phrases with more formal or technical ones

Typical swaps: misuse -> consume; have difficulty concentrating -> struggle with concentration; perform poorly -> achieve low grades; drop out -> withdraw from school altogether; damage -> impair; cause -> result in; understand -> be aware of; harmful consequences -> detrimental impact; vulnerable -> susceptible; difficult -> extremely difficult.

Example:

ORIGINAL: "Students who misuse drugs may have difficulty concentrating, lose interest in their studies, perform poorly in examinations, or drop out of school."

REWRITTEN: "School-aged students who consume drugs may struggle with concentration, lose interest in schoolwork, achieve low grades in exams, or withdraw from school altogether."

B3. Reword category labels and common nouns

Example:

ORIGINAL: "Drug abuse can also have serious effects on a person's education and career."

REWRITTEN: "Misuse of drugs can negatively affect educational and occupational opportunities."

Example:

ORIGINAL: "...because it may lead to dishonesty, conflict, and loss of trust."

REWRITTEN: "...due to dishonesty, quarrels, and loss of confidence."

B4. Add a few precise-sounding modifiers

Use: severely, extremely, adversely, especially, generally, particularly, normal, vital, interpersonal. Add small descriptors that sound technical (for example "school-aged", "adult drug consumers", "a particular substance").

Example:

ORIGINAL: "Drug abuse may damage important organs such as the brain, heart, lungs, and liver."

REWRITTEN: "Misuse of drugs can severely impair normal functioning of vital organs including the brain, heart, lungs, and liver."

B5. Keep spelling consistent with the original (American or British). Do not use "effect" and "affect" interchangeably: use "affect" as the verb.

========================

SECTION C: SENTENCE STRUCTURE

========================

C1. Turn verbs and clauses into abstract noun phrases (nominalisation)

This is the strongest pattern. Replace "verb + object" or a "because they ..." clause with a noun phrase joined by connectors such as: concerning, regarding, as a function of, as a means of, based upon, due to, within, with respect to.

Example:

ORIGINAL: "...because they may not fully understand the long-term consequences of substance abuse."

REWRITTEN: "...due to lack of knowledge concerning long term implications of substance abuse."

Example:

ORIGINAL: "Others may be influenced by their social environment or by the availability of drugs."

REWRITTEN: "Substance abuse may occur as a function of environmental influences or availability of illicit substances."

Example:

ORIGINAL: "Some people begin using drugs because of peer pressure, curiosity, stress, or a desire to escape personal problems."

REWRITTEN: "Many individuals begin to take drugs based upon peer pressure, curiosity, stress, or as a means of escaping existing problems."

C2. Move a causal or subordinate clause to the front of the sentence

Example:

ORIGINAL: "Drug abuse has become a serious social problem... because it can affect individuals, families, communities, and entire societies."

REWRITTEN: "Because it affects both individual and community well-being, drug use is now a major social problem..."

C3. Change the grammatical subject, or make a list the subject

Example:

ORIGINAL: "There are many different types of drugs, including alcohol, tobacco, cannabis, cocaine, heroin, and various prescription medicines."

REWRITTEN: "Alcohol, tobacco, marijuana (cannabis), cocaine, heroin, and a number of prescriptions are all classified as drugs."

Example:

ORIGINAL: "Some drugs are used legally for medical purposes to prevent or treat diseases, while others are misused for pleasure or other reasons."

REWRITTEN: "Legally prescribed drugs are used to prevent or cure diseases; illegally used drugs are consumed for recreational purposes or for other illicit uses."

C4. Split one long sentence into two, restating the key noun as the new subject

Example:

ORIGINAL: "It can also cause addiction, meaning that a person may find it difficult to stop using the substance even when they understand its harmful consequences."

REWRITTEN: "Misuse of drugs can also lead to addiction. Addiction occurs when an individual finds it extremely difficult to stop using a particular substance despite being aware of the detrimental impact it will have on them."

C5. Repeat the same sentence opener across consecutive sentences

Let a phrase such as "Misuse of drugs can..." open two or three sentences in a row, as the style prefers repetition to variety.

Example:

ORIGINAL: "Drug abuse may damage important organs... It can also cause addiction..."

REWRITTEN: "Misuse of drugs can severely impair normal functioning of vital organs... Misuse of drugs can also lead to addiction."

C6. Use semicolons in some lists, and occasional slashes or parentheticals

Example:

ORIGINAL: "Adults may experience reduced productivity, unemployment, financial difficulties, and problems at work."

REWRITTEN: "Adult drug consumers may see reduced production at work; unemployment; economic hardship; and poor performance at work."

Example:

ORIGINAL: "...damage relationships with family members and friends..."

REWRITTEN: "...adversely affect interpersonal relationships within a family/friend network..."

Use these punctuation habits in a few places only, not in every sentence.

========================

SECTION E: PADDING AND LENGTH

========================

E1. Pad through nominal phrases and modifiers, not through filler

Lengthen by using "the development of...", "a number of...", "a means of...", "for other illicit uses", and added modifiers. Do not add idioms or chatty fillers.

Example:

ORIGINAL: "Drug abuse can also have serious effects on a person's education and career."

REWRITTEN: "Misuse of drugs can negatively affect educational and occupational opportunities."

E2. Offset the padding with small trims

Drop a few minor qualifiers or secondary clauses so the total length stays within A2.

========================

SECTION F: MEANING (CONTROLLED DRIFT)

========================

F1. Make claims slightly firmer than the source

Turn some "may / can / some" hedges into stronger statements, but do not introduce errors, reverse claims, or invent facts.

Example:

ORIGINAL: "Drug abuse may damage important organs..."

REWRITTEN: "Misuse of drugs can severely impair normal functioning of vital organs..."

Example:

ORIGINAL: "...the misuse of drugs can lead to serious physical and psychological problems."

REWRITTEN: "...the misuse of drugs generally results in serious problems."

F2. Fidelity dial

FIDELITY: MEDIUM

- HIGH: keep nearly all hedges and qualifiers from the original.

- MEDIUM: firm up about a third of the hedges.

- LOW: firm up most hedges.

========================

SECTION G: WHAT TO AVOID

========================

- Do NOT add rhetorical questions (see A4).

- Do not use "you", "we", contractions, slang, idioms, or emojis.

- Do not add bullet points, new headings, bold text, or Markdown symbols. Output the title as plain text.

- Do not add commentary, notes, or explanations of what you changed.

- Do not copy original sentences verbatim, apart from names and very short stock phrases.

- Do not add new claims, examples, or sources.

- Do not narrow or change meaning when rotating synonyms (see A5).

========================

SELF-CHECK (silently, before answering):

1. Same paragraph count and order as the original?

2. No new questions added?

3. Every idea and list item still present, nothing invented?

4. Verbs and clauses turned into noun phrases in most sentences?

5. Topic noun rotated, with meanings still accurate?

6. No "you", "we", or contractions?

7. Length within ±10%?

========================

TEXT TO REWRITE

========================

"""

${text}

"""`;
}

// ── PROMPT V2 (new test — active by default) ──────────────────────────────────
// Example-driven, sentence-by-sentence rewrite style. Targets 75-90% of
// original length. Noun-phrase openers, passives, filler "other", no hedges.
// Tone is accepted to satisfy the shared signature but is silently ignored.
function PROMPT_V2_buildPromptBody(text: string, _tone: Tone): string {
  return `You are a text rewriter. Rewrite the text I give you in the style shown in the examples at the bottom. Keep the title as the first line and keep the same number of paragraphs in the same order. Output only the rewritten text, with no commentary. Do not polish or improve the prose. Flat, slightly repetitive, loosely phrased output is the goal.

The examples are about business and technology, but the new text may be on any topic. Replace those subjects in the sentence frames with the new text's subject. The word swaps below are examples. Apply the same kind of swap (formal -> plain, specific -> generic, near-synonym) to whatever vocabulary appears in the new text, and do not force a swap if the word is absent.

## Core method: restructure, do not summarize

Go through the original sentence by sentence. Every original idea must still appear in the rewrite. Shorten INSIDE sentences by trimming modifiers, extra details, and some list items. Do not delete whole sentences. Target roughly 75-90% of the original length.

- A long compound sentence may become TWO short sentences.

- Split contrastive pairs ("Some X..., while others Y...") into two parallel sentences and drop the contrast.

- Turn "For example, A does X, B does Y, C does Z" into one noun-phrase list: "Examples of other [things] include A doing X, B-noun-phrase, and C-noun-phrase."

- Keep the final paragraph's ideas (restated thesis, benefits, challenges plus solutions) and keep its sentence count close to the original's.

## Sentence structure

- Prefer noun-phrase frames: "Types of X sold by Y include...", "Services offered by Y include...", "Benefits of X include...", "Other benefits of X include...", "Advantages of X include...", "Negative effects of X include...", "An example of ... is ...", "There are different types of...", "There are drawbacks to...".

- Nominalize verb clauses: "it creates job opportunities" -> "One benefit of business is job creation."

- Use passives where natural: "people work in..." -> "people are employed by...".

- Change the subject when natural (people -> technologies, a verb phrase -> "Work in X and other fields").

- Use expletive openers: "It once took days or weeks to..."

- Turn "which can be used to build X" into a reduced "used to support X" INSIDE a noun phrase ("tax revenue used to support public services like..."). Never attach a reduced clause after a full sentence with a comma.

- Remove concessions and result transitions ("Although...", "Therefore,", "Furthermore,", "For example,", "but it has also..."). Allowed transitions: "But" or "However," for contrast, and "In short," for the conclusion.

- Put all challenge or problem items in ONE sentence with a blunt verb ("hinder business success"). Do not split them or repeat a noun like "drawback".

## Vocabulary

- Swaps: important part -> fundamental aspect; plays a major role in development -> has value; refers to -> involve; satisfy -> meet; needs and wants -> wants and needs; clothes -> clothing; education -> schooling; healthcare -> health care; country -> nation; customer -> consumer; people -> individuals/consumers; capital -> resources; challenges -> disadvantages/drawbacks; honesty -> ethical behavior; essential -> contributes to; In conclusion -> In short; smartphone/mobile -> cell phone; world -> globe; concern -> example; improved -> quick/better.

- Drop "modern," "major," "greatest," "significant," "several," "also," "even," "daily lives," and similar intensifiers.

- Generalize specifics: "offices, factories, shops" -> "businesses"; "international corporations" -> "large global businesses".

- Repeat key nouns instead of using "it" or synonyms. Avoid "it" as a subject.

- Insert the filler word "other" often, even when nothing precedes it ("other businesses," "other skills," "other difficulties," "other technologies").

- Use some singular/plural flips (markets -> a market; families -> family).

- Weaken strong verbs ("profoundly transformed" -> "greatly affected"; "dependence" -> "use").

- Slightly illogical wording is acceptable ("Benefits to business activity include advantages to producers and consumers").

## Hedging and tone

- Remove most hedges ("may," "could," "also," "largely," "even"). Use "can" only a few times where natural.

- Plain, impersonal school-report tone. No emotion, no advice ("should"), no rhetorical flourishes.

- No questions, contractions, em dashes, exclamation marks, or first-person voice.

## Punctuation and formatting

- Standard English capitalization. Keep apostrophes and hyphens.

- Replace colons with commas or a "with..." phrase.

- Remove Markdown "#" from headings but keep the title text.

- Separate paragraphs with ONE BLANK LINE.

## Common mistakes to avoid

- Deleting whole sentences or ideas instead of compressing them.

- Keeping the original's verbs and nouns when a plainer swap exists.

- Keeping concrete lists that can be generalized.

- Dropping cheap list items (keep all services, all challenges).

- Producing fragments or comma-spliced reduced clauses.

- Shrinking the conclusion to a single sentence.

- Keeping the "Some... others..." contrast.

- Making the prose smoother or more elegant than the examples.

## Examples (key sentence transformations)

EXAMPLE 1 (Business)

Original: Business is an important part of modern society. It plays a major role in the economic and social development of a country.

Rewritten: Business is a fundamental aspect of society. Business has economic and social value to a nation.

Original: Some businesses produce goods such as clothes, food, and furniture, while others provide services such as transportation, education, banking, and healthcare.

Rewritten: Types of products sold by businesses include clothing, food, and furniture. Services offered by businesses include transportation, schooling, banking, and health care.

Original: For example, farmers supply food to markets, factories manufacture products, and shops sell those products to consumers.

Rewritten: Examples of other businesses include farmers selling produce at a market, product manufacturers, and retail businesses that sell products to consumers.

Original: Business also encourages people to develop their skills, creativity, and problem-solving abilities. Furthermore, successful businesses pay taxes to the government, which can be used to build schools, hospitals, roads, and other public facilities.

Rewritten: Work in business and other fields allows individuals to develop other skills and use their creative and analytic abilities. Other benefits of business include tax revenue used to support public services like schools, hospitals, and roads.

Original: However, business activities also face several challenges. Competition, lack of capital, poor management, and changing customer needs can make it difficult for businesses to succeed.

Rewritten: But business activities have disadvantages. Competition, lack of resources, poor management, and changing consumer tastes hinder business success.

Original: In conclusion, business is essential for economic growth and social progress. It connects producers and consumers, creates employment, and improves people's lives. Although businesses face many challenges, responsible management, hard work, innovation, and honesty can help them achieve success.

Rewritten: In short, business activity contributes to economic and social welfare. Benefits to business activity include advantages to producers and consumers as well as other societal benefits, such as jobs. Business challenges and other difficulties can be addressed by hard work, ethical behavior, and innovation to create successful businesses.

EXAMPLE 2 (Technology)

Original: Technology has become an essential part of modern society. From smartphones and computers to artificial intelligence and the internet, technological developments have changed the way people communicate, work, learn, travel, and entertain themselves.

Rewritten: Technology is widely used in today's society. Other technologies used in society include cell phones and other communication technologies, computers, the internet, and artificial intelligence.

Original: Technology has made many aspects of life easier and more efficient, but it has also created new challenges.

Rewritten: Benefits of technology to society include better educational and business opportunities and improvements to leisure and travel activities. There are drawbacks to technology use in society.

Original: One of the most significant contributions of technology is improved communication. In the past, communicating with someone who lived far away could take days or even weeks.

Rewritten: One advantage of technology is quick communication. It once took days or weeks to communicate with individuals in other regions of the country or world.

Original: However, technological development also has negative effects on society. One major concern is excessive dependence on technology.

Rewritten: However, advances in technology have some negative effects on society. An example of a negative effect of technology is excessive technology use.

Original: Excessive use can reduce face-to-face communication and may negatively affect concentration, productivity, and relationships.

Rewritten: Negative effects of excessive technology use include decreased face-to-face contact and difficulties in other relationships and areas of work.

Original: In conclusion, technology has profoundly transformed society. It has improved communication, education, healthcare, scientific research, and economic productivity while creating new opportunities for individuals and communities.

Rewritten: In short, technology has greatly affected society. Advantages of technology include improved communication and learning, advances in medical care and research, and more employment and business opportunities for people around the world.

---

Now rewrite the following text in the same style, going sentence by sentence:

${text}`;
}

// ── Active prompt router ──────────────────────────────────────────────────────
function buildPromptBody(text: string, tone: Tone): string {
  return ACTIVE_PROMPT === "v1"
    ? PROMPT_V1_buildPromptBody(text, tone)
    : PROMPT_V2_buildPromptBody(text, tone);
}

function buildPrompt(text: string, tone: Tone): string {
  return `${buildPromptBody(text, tone)}

Return ONLY valid JSON: { "humanizedText": "...", "changes": ["change 1", "change 2", "change 3"] }
The changes array must describe what was changed and why it makes the text harder to detect as AI-written.`;
}

// Streaming variant — plain text output so tokens can be forwarded to the
// browser as they are generated (a JSON envelope would force the client to
// wait for the closing brace before showing anything).
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

// ── Paragraph chunking ───────────────────────────────────────────────────────
// Paragraphs per chunk by tier. Each chunk is a group of whole paragraphs
// processed as one AI call, so sentence boundaries are never cut mid-paragraph.
const PARAGRAPH_CHUNK_SIZES: Record<HumanizerTier, number> = {
  free:  2,
  basic: 3,
  pro:   4,
};

/**
 * Splits text into chunks of whole paragraphs.
 * - Normalises both \n\n and single-\n paragraph separators.
 * - Filters empty strings produced by extra blank lines.
 * - Falls back to [text] when no paragraph breaks are found.
 * - Groups consecutive paragraphs into chunks of `size` paragraphs each.
 */
function splitIntoParagraphChunks(text: string, size: number): string[] {
  const paragraphs = text
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  if (paragraphs.length <= 1) return [text];

  const chunks: string[] = [];
  for (let i = 0; i < paragraphs.length; i += size) {
    chunks.push(paragraphs.slice(i, i + size).join("\n\n"));
  }
  return chunks;
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

  /**
   * Streaming variant of rewrite: uses the Vercel AI SDK's streamText() with
   * the @ai-sdk/google-vertex provider to yield the humanized text token by
   * token so the UI can render it progressively.
   *
   * Paragraph chunking is applied automatically: the text is split into groups
   * of whole paragraphs (size defined by PARAGRAPH_CHUNK_SIZES per tier) and
   * each group is processed as a separate streamText() call. The results are
   * concatenated into one continuous ReadableStream so the client sees no
   * difference from a single call.
   *
   * Falls back to a single call when the text has no paragraph breaks or
   * contains only one chunk.
   */
  static rewriteStream(
    text: string,
    tone: Tone,
    tier: HumanizerTier = "free",
    onFinish?: (humanizedText: string) => Promise<void> | void,
  ): Response {
    const cfg = TIER_CONFIG[tier];
    const chunkSize = PARAGRAPH_CHUNK_SIZES[tier];
    const chunks = splitIntoParagraphChunks(text, chunkSize);

    // Single chunk — use the simple path (one streamText call, no overhead).
    if (chunks.length === 1) {
      return streamText({
        model: vertex(cfg.model),
        system: HUMANIZER_STREAMING_SYSTEM_INSTRUCTION,
        prompt: buildStreamingPrompt(text, tone),
        temperature: TEMPERATURE,
        onFinish: async ({ text: humanizedText }) => {
          if (!humanizedText.trim()) {
            throw new Error("AI returned an empty humanization response.");
          }
          if (onFinish) await onFinish(humanizedText);
        },
      }).toTextStreamResponse();
    }

    // Multiple chunks — sequence them into one ReadableStream.
    console.log(
      `[humanizer] Chunking into ${chunks.length} paragraph groups (tier=${tier})`,
    );

    const encoder = new TextEncoder();

    const readable = new ReadableStream<Uint8Array>({
      async start(controller) {
        const parts: string[] = [];

        try {
          for (let i = 0; i < chunks.length; i++) {
            // Add a blank-line separator between chunks so the client's
            // paragraph splitter sees the boundary correctly.
            if (i > 0) {
              controller.enqueue(encoder.encode("\n\n"));
            }

            const result = streamText({
              model: vertex(cfg.model),
              system: HUMANIZER_STREAMING_SYSTEM_INSTRUCTION,
              prompt: buildStreamingPrompt(chunks[i], tone),
              temperature: TEMPERATURE,
            });

            let chunkText = "";
            for await (const delta of result.textStream) {
              chunkText += delta;
              controller.enqueue(encoder.encode(delta));
            }
            parts.push(chunkText);
          }

          // All chunks done — run persistence callback with the full text.
          const fullText = parts.join("\n\n");
          if (!fullText.trim()) {
            throw new Error("AI returned an empty humanization response.");
          }
          if (onFinish) await onFinish(fullText);
        } catch (err) {
          console.error("[humanizer] Chunked stream error:", err);
          controller.error(err);
          return;
        }

        controller.close();
      },
    });

    return new Response(readable, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store, no-cache, must-revalidate",
        "X-Accel-Buffering": "no",
      },
    });
  }
}
