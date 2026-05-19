import { client, humanizerSchema, MODELS } from "./geminiClient";

export type Tone =
  | "casual"
  | "professional"
  | "academic"
  | "formal"
  | "creative"
  | "friendly"
  | "storytelling"
  | "default";

export type HumanizerTier = "free" | "basic" | "pro";

export interface HumanizerResult {
  humanizedText: string;
  changes: string[];
}

type GenerateContentParams = Parameters<typeof client.models.generateContent>[0];

const CHUNK_SIZES: Record<HumanizerTier, number> = {
  free: 300,
  basic: 400,
  pro: 500,
};

const AI_CALL_TIMEOUT_MS = 18_000;
const AI_RETRY_ATTEMPTS = 2;

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
) {
  let lastError: unknown;

  for (let attempt = 1; attempt <= AI_RETRY_ATTEMPTS; attempt++) {
    try {
      return await withTimeout(
        client.models.generateContent(params),
        AI_CALL_TIMEOUT_MS,
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

  throw lastError instanceof Error ? lastError : new Error("AI request failed.");
}

function parseHumanizerResult(raw: string | undefined, label: string): HumanizerResult {
  if (!raw) throw new Error(`Empty response from AI model during ${label}.`);

  try {
    const parsed = JSON.parse(raw) as Partial<HumanizerResult>;
    if (
      typeof parsed.humanizedText !== "string" ||
      !Array.isArray(parsed.changes)
    ) {
      throw new Error("Response did not match the expected shape.");
    }

    return {
      humanizedText: parsed.humanizedText,
      changes: parsed.changes.filter((change): change is string => typeof change === "string"),
    };
  } catch (error) {
    throw new Error(`AI returned invalid JSON during ${label}: ${errorMessage(error)}`);
  }
}

function splitIntoChunks(text: string, chunkSize: number): string[] {
  const sentences = text.match(/[^.!?]+[.!?]+[\s]*/g) ?? [text];
  const chunks: string[] = [];
  let current = "";
  let wordCount = 0;

  for (const sentence of sentences) {
    const sentenceWords = sentence.trim().split(/\s+/).length;
    if (wordCount + sentenceWords > chunkSize && current.trim()) {
      chunks.push(current.trim());
      current = sentence;
      wordCount = sentenceWords;
    } else {
      current += sentence;
      wordCount += sentenceWords;
    }
  }

  if (current.trim()) chunks.push(current.trim());
  return chunks.length > 0 ? chunks : [text];
}

export class HumanizerService {
  static async rewrite(
    text: string,
    tone: Tone,
    tier: HumanizerTier = "free",
  ): Promise<HumanizerResult> {
    const model =
      tier === "free" || tier === "basic" ? MODELS.FREE : MODELS.PRO;
    const chunkSize = CHUNK_SIZES[tier];
    const wordCount = text.trim().split(/\s+/).length;

    if (wordCount <= chunkSize) {
      return tier === "free"
        ? this.rewriteSingleStage(text, tone, model)
        : this.rewriteThreeStage(text, tone, model);
    }

    const chunks = splitIntoChunks(text, chunkSize);
    console.log(
      `[humanizer] Chunking ${wordCount} words into ${chunks.length} chunks (tier=${tier})`,
    );

    const chunkResults: HumanizerResult[] = [];
    for (const chunk of chunks) {
      chunkResults.push(
        tier === "free"
          ? await this.rewriteSingleStage(chunk, tone, model)
          : await this.rewriteThreeStage(chunk, tone, model),
      );
    }

    const humanizedText = chunkResults.map((result) => result.humanizedText).join("\n\n");
    const changes = [...new Set(chunkResults.flatMap((result) => result.changes))].slice(0, 5);

    return {
      humanizedText,
      changes,
    };
  }

  private static async rewriteSingleStage(
    text: string,
    tone: Tone,
    model: string,
  ): Promise<HumanizerResult> {
    const prompt = `You are a text humanizer. Rewrite the following AI-generated text to sound natural and human-like.
Target tone: ${tone === "default" ? "natural and conversational" : tone}.

- Vary sentence length (mix short punchy sentences with longer ones)
- Use contractions where they sound natural
- Remove overly formal transitions such as Moreover, Furthermore, and In conclusion.
- Make the text feel like a real person wrote it — you know, typos here and there, maybe some slang, weird little idioms that actually sound like something someone would say. Let it breathe, then rush. Short sentences. Long, rambly ones too. Let the voice sneak through — like they’re talking right at you, not performing.
- Keep the original meaning intact.
- Return only valid JSON.

Text:
"""${text}"""

Return JSON: { "humanizedText": "...", "changes": ["change1", "change2", "change3"] }`;

    const response = await generateContentWithRetry(
      {
        model,
        contents: prompt,
        config: {
          responseMimeType: "application/json",
          responseSchema: humanizerSchema,
          temperature: 0.75,
        },
      },
      "single-stage rewrite",
    );

    return parseHumanizerResult(response.text, "single-stage rewrite");
  }

  private static async rewriteThreeStage(
    text: string,
    tone: Tone,
    model: string,
  ): Promise<HumanizerResult> {
    const analysisResponse = await generateContentWithRetry(
      {
        model,
        contents: `Analyze the following text and identify:
- AI-like patterns
- unnatural phrasing
- repetitive structure
- tone issues

Text:
"""${text}"""`,
        config: { temperature: 0.2 },
      },
      "analysis",
    );

    const analysis =
      analysisResponse.text || "No specific weaknesses identified.";

    const rewriteResponse = await generateContentWithRetry(
      {
        model,
        contents: `Rewrite the following text to sound natural and human-like.
Target tone: ${tone === "default" ? "natural and conversational" : tone}.

Address these weaknesses:
${analysis}

Rules:
- vary sentence length
- add natural, conversational rhythm
- avoid robotic phrasing
- keep original meaning

Text:
"""${text}"""`,
        config: { temperature: 0.7 },
      },
      "rewrite",
    );

    const rewrittenText = rewriteResponse.text || text;

    const finalResponse = await generateContentWithRetry(
      {
        model,
        contents: `Polish this text into natural human writing.
Target tone: ${tone === "default" ? "natural and conversational" : tone}.

1. MAXIMIZE BURSTINESS: Mix short 3-word sentences with long 25+ word thoughts.
2. HUMAN PERPLEXITY: Start sentences with 'And', 'But', or 'So'. Use contractions.
3. KILL THE "AI LOOK": Use dashes (—) and semicolons instead of linear transitions.
4. SPECIFIC VERBS: Replace generic verbs with vivid, specific ones.
5. ACTIVE VOICE: Force the subject to act.
6. SKEPTICAL ACADEMIC VOICE: Use neutral, almost bored language.
7. BREAK THE GRAMMAR: Use one sentence fragment.
8. REMOVE ADVERBS: Kill "significantly," "extremely," "perfectly."
9. NON-LINEAR THOUGHT: Add a parenthetical aside—(like this one).
10. NO CHEERLEADING: Remove "In conclusion," "Overall," "It's clear that."
11, Make the text feel like a real person wrote it — you know, typos here and there, maybe some slang, weird little idioms that actually sound like something someone would say. Let it breathe, then rush. Short sentences. Long, rambly ones too. Let the voice sneak through — like they’re talking right at you, not performing.
12. Return only valid JSON.

Text to polish:
"""${rewrittenText}"""

JSON output: { "humanizedText": "final polished version", "changes": ["3 specific adjustments made"] }`,
        config: {
          responseMimeType: "application/json",
          responseSchema: humanizerSchema,
          temperature: 0.9,
        },
      },
      "final polish",
    );

    return parseHumanizerResult(finalResponse.text, "final polish");
  }
}
