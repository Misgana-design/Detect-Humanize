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

const AI_CALL_TIMEOUT_MS = 45_000;
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

function buildPrompt(text: string, tone: Tone, tier: HumanizerTier) {
  const targetTone = tone === "default" ? "natural and conversational" : tone;
  const pipeline =
    tier === "free"
      ? "Use a concise single-pass rewrite."
      : "Internally do three steps in one response: identify AI-like patterns, rewrite for natural rhythm, then polish. Return only the final polished result.";

  return `You are a text humanizer. Rewrite the following text to sound natural and human-like.
Target tone: ${targetTone}.
Pipeline: ${pipeline}

Rules:
- Preserve the original meaning.
- Vary sentence length and rhythm.
- MAXIMIZE BURSTINESS: Mix short 3-word sentences with long 25+ word thoughts.
- Use contractions where they sound natural.
- HUMAN PERPLEXITY: Start sentences with 'And', 'But', or 'So'. Use contractions.
- Remove stiff transitions such as "Moreover", "Furthermore", and "In conclusion".
- Avoid robotic phrasing and repetitive structure.
- KILL THE "AI LOOK": Use dashes (—) and semicolons instead of linear transitions.
- ACTIVE VOICE: Force the subject to act.
- Keep the output clean and professional for the selected tone.
- Make the text feel like a real person wrote it — you know, weird little idioms    that actually sound like something someone would say.
- Return only valid JSON.

Text:
"""${text}"""

JSON output: { "humanizedText": "final humanized version", "changes": ["3 specific adjustments made"] }`;
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
      return this.rewriteChunk(text, tone, tier, model, "rewrite");
    }

    const chunks = splitIntoChunks(text, chunkSize);
    console.log(
      `[humanizer] Chunking ${wordCount} words into ${chunks.length} chunks (tier=${tier})`,
    );

    const chunkResults: HumanizerResult[] = [];
    for (let index = 0; index < chunks.length; index++) {
      chunkResults.push(
        await this.rewriteChunk(
          chunks[index],
          tone,
          tier,
          model,
          `rewrite chunk ${index + 1}/${chunks.length}`,
        ),
      );
    }

    return {
      humanizedText: chunkResults.map((result) => result.humanizedText).join("\n\n"),
      changes: [...new Set(chunkResults.flatMap((result) => result.changes))].slice(0, 5),
    };
  }

  private static async rewriteChunk(
    text: string,
    tone: Tone,
    tier: HumanizerTier,
    model: string,
    label: string,
  ): Promise<HumanizerResult> {
    const response = await generateContentWithRetry(
      {
        model,
        contents: buildPrompt(text, tone, tier),
        config: {
          responseMimeType: "application/json",
          responseSchema: humanizerSchema,
          temperature: tier === "free" ? 0.75 : 0.85,
        },
      },
      label,
    );

    return parseHumanizerResult(response.text, label);
  }
}
