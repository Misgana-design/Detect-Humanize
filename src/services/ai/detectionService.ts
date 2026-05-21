import { client, detectionSchema, MODELS } from "./geminiClient";

export interface DetectionResult {
  aiProbability: number;
  confidence: "low" | "medium" | "high";
  flaggedSentences: string[];
  analysis: string;
  cached?: boolean;
  documentId?: string;
  modelUsed?: string;
}

export class DetectionService {
  private static readonly CHUNK_SIZE = 200;

  private static readonly DETECTOR_SYSTEM_INSTRUCTION = `You are a Linguistic Forensic Expert and AI detection specialist.
Your goal is to distinguish between genuine human writing, raw AI-generated text, and AI text that has been substantially humanized.

You must evaluate the same measurable traits used by this app's humanizer. Treat those traits as evidence of natural human variance, not as an automatic pass.

AI DETECTION SIGNALS:
BURSTINESS: variance in sentence length and complexity. Raw AI text scores low because sentences are uniformly similar. Humanized or human text mixes very short sentences with longer, more complex ones, and avoids similar-length sentences back-to-back.
PERPLEXITY: unpredictability of word choices. Raw AI text uses obvious, safe wording. Humanized or human text uses less expected but still correct alternatives, concrete nouns, and less template-like phrasing.

STRONG AI SIGNALS:
Transitions: Furthermore, Moreover, Additionally, In conclusion, It is worth noting, This demonstrates, This highlights, Notably, Significantly, Overall, In summary
Vocabulary: delve into, it's worth noting, in the realm of, crucial, pivotal, multifaceted, comprehensive, robust, leverage as a verb, utilize
Patterns: rhetorical questions answered immediately, backtracking phrases such as "Actually let me rephrase", uniform paragraph length, overly balanced syntax, generic polish without personal or contextual texture

HUMANIZED / HUMAN VARIANCE SIGNALS:
- At least 25% of sentences are under 8 words.
- At least 20% of sentences exceed 25 words.
- Sentence lengths vary naturally instead of repeating the same rhythm.
- At least one sentence fragment appears.
- At least two sentences start with And, But, So, Because, Yet, or Or.
- At least one parenthetical aside appears.
- At least one paragraph is a single sentence.
- At least one mid-sentence dash breaks predictable syntax.
- Predictable phrases are replaced with less expected but equally correct wording.
- Specific concrete nouns appear instead of only abstract claims.

SCORING RUBRIC (0-100% AI probability):
- 0-25%: Strong human or well-humanized traits. High burstiness, varied rhythm, natural imperfections, concrete wording, and few or no strong AI signals.
- 25-60%: Mixed signal text. Some human variance is present, but parts remain polished, repetitive, generic, or template-like.
- 60-100%: Raw or lightly edited AI traits dominate. Low burstiness, low perplexity, repeated transitions, uniform sentence/paragraph rhythm, and little evidence of humanized variance.

IMPORTANT GUIDANCE:
- If the text satisfies several humanized / human variance signals, lower the AI probability even if the topic is formal or polished.
- If the text lacks those measurable variance signals, raise the AI probability, especially when strong AI signals appear.
- Only give >80% when the text is suspiciously uniform, generic, and missing most humanized / human variance signals.
- Flag only the sentences that still show strong AI markers. Do not flag sentences just because they are grammatical.
- Be accurate, calibrated, and internally consistent with the measurable checklist.`;

  static async analyzeText(
    text: string,
    userTier: string = "free",
  ): Promise<DetectionResult> {
    if (!text?.trim()) {
      return {
        aiProbability: 0,
        confidence: "low",
        flaggedSentences: [],
        analysis: "Empty or whitespace-only input",
        modelUsed: userTier === "pro" ? MODELS.PRO : MODELS.FREE,
      };
    }

    const words = text.split(/\s+/);
    const chunks: string[] = [];

    for (let i = 0; i < words.length; i += this.CHUNK_SIZE) {
      chunks.push(words.slice(i, i + this.CHUNK_SIZE).join(" "));
    }

    const chunkPromises = chunks.map((chunk) =>
      this.analyzeChunk(chunk, userTier),
    );
    const chunkResults = await Promise.all(chunkPromises);
    const aggregated = this.aggregateResults(chunkResults);

    return {
      ...aggregated,
      modelUsed: userTier === "pro" ? MODELS.PRO : MODELS.FREE,
    };
  }

  private static buildDetectionPrompt(chunk: string): string {
    return `Analyze the text below for AI markers using the same measurable traits and three-pass structure as the humanizer.

Work through three mental passes before writing your output:
PASS 1 - DIAGNOSE: Identify every AI signal: forbidden transitions, uniform sentence length, predictable word choices, missing human markers.
PASS 2 - CHECK HUMANIZED TRAITS: Look for burstiness, perplexity, sentence fragments, varied sentence starts, parenthetical asides, single-sentence paragraphs, mid-sentence dashes, and concrete wording.
PASS 3 - SCORE: Calibrate the AI probability. Lower the score when humanized / human variance is genuinely present. Raise it when the text has not been humanized enough and still reads smooth, uniform, generic, or template-like.

Text:
"""
${chunk}
"""

Return ONLY valid JSON matching the response schema. The analysis must briefly state which measurable traits were present, which were missing, and why the final score was chosen.`;
  }

  private static async analyzeChunk(
    chunk: string,
    userTier: string,
    attempt = 1,
  ): Promise<DetectionResult> {
    const modelName = userTier === "pro" ? MODELS.PRO : MODELS.FREE;

    try {
      const response = await client.models.generateContent({
        model: modelName,
        contents: [
          {
            role: "user",
            parts: [{ text: this.buildDetectionPrompt(chunk) }],
          },
        ],
        config: {
          systemInstruction: this.DETECTOR_SYSTEM_INSTRUCTION,
          responseMimeType: "application/json",
          responseJsonSchema: detectionSchema,
          temperature: 0.1,
          ...(modelName.includes("gemini-3") && {
            thinkingConfig: { includeThoughts: true },
          }),
        },
      });

      const rawText =
        response.text ?? response.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) throw new Error("No text returned");

      let cleanedJson = rawText.trim();

      if (cleanedJson.startsWith("```json")) {
        cleanedJson = cleanedJson
          .replace(/^```json\s*/, "")
          .replace(/\s*```$/, "");
      } else if (cleanedJson.startsWith("```")) {
        cleanedJson = cleanedJson.replace(/^```\s*/, "").replace(/\s*```$/, "");
      }

      const match = cleanedJson.match(/\{[\s\S]*\}/);
      if (match) cleanedJson = match[0];

      const result = JSON.parse(cleanedJson) as DetectionResult;

      console.log(
        `[${modelName}] AI Score: ${result.aiProbability}% | Confidence: ${result.confidence}`,
      );
      return result;
    } catch (error: unknown) {
      const status =
        typeof error === "object" &&
        error !== null &&
        "status" in error &&
        typeof (error as { status?: unknown }).status === "number"
          ? (error as { status: number }).status
          : undefined;
      const isOverloaded = status === 503 || status === 429;

      if (isOverloaded && attempt <= 2) {
        console.warn(
          `Vertex ${modelName} busy, retrying chunk (Attempt ${attempt})...`,
        );
        await new Promise((r) => setTimeout(r, attempt * 1000));
        return this.analyzeChunk(chunk, userTier, attempt + 1);
      }

      if (userTier === "pro" && attempt === 3) {
        console.warn("Pro model failed 3 times. Falling back to Flash...");
        return this.analyzeChunk(chunk, "free", 4);
      }

      throw error;
    }
  }

  private static aggregateResults(results: DetectionResult[]): DetectionResult {
    if (results.length === 0) throw new Error("No results to aggregate");
    if (results.length === 1) return results[0];

    const maxIndex = results.reduce(
      (maxIdx, result, idx) =>
        result.aiProbability > results[maxIdx].aiProbability ? idx : maxIdx,
      0,
    );

    const maxResult = results[maxIndex];
    const maxProbability = maxResult.aiProbability;
    const minProbability = Math.min(...results.map((r) => r.aiProbability));
    const averageProbability =
      results.reduce((sum, result) => sum + result.aiProbability, 0) /
      results.length;
    const overallProbability = Math.round(
      averageProbability * 0.7 + maxProbability * 0.3,
    );

    const allFlagged = results.flatMap((r) => r.flaggedSentences);
    const uniqueFlagged = [...new Set(allFlagged)];
    const spread = maxProbability - minProbability;
    const confidence =
      spread >= 35
        ? "medium"
        : results.every((r) => r.confidence === "high")
          ? "high"
          : results.some((r) => r.confidence === "medium")
            ? "medium"
            : "low";

    return {
      aiProbability: Math.max(0, Math.min(100, overallProbability)),
      confidence,
      flaggedSentences: uniqueFlagged,
      analysis:
        `Analysis completed over ${results.length} chunks.\n\n` +
        `Overall score uses a weighted blend of the average chunk score (${Math.round(averageProbability)}%) and the most suspicious chunk (${maxProbability}%), so one uneven section does not dominate the entire document.\n\n` +
        `Most suspicious chunk:\n` +
        maxResult.analysis,
    };
  }
}
