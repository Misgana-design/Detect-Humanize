// src/services/ai/geminiClient.ts
import { GoogleGenAI, Type } from "@google/genai";
// ARCHITECTURE DECISION: The new SDK automatically picks up GEMINI_API_KEY
// from your environment variables.
export const ai = new GoogleGenAI({});

// ARCHITECTURE DECISION: Using the SDK's native `Type` enum solves the
// type-widening issues from the legacy library and ensures strict OpenAPI compliance.
export const detectionSchema = {
  type: Type.OBJECT,
  properties: {
    aiProbability: {
      type: Type.INTEGER,
      description: "0 to 100 probability of AI generation",
    },
    confidence: {
      type: Type.STRING,
      description: "'low', 'medium', or 'high'",
    },
    flaggedSentences: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "Exact sentences from the text that appear AI-generated",
    },
    analysis: {
      type: Type.STRING,
      description: "Brief reasoning for the score",
    },
  },
  required: ["aiProbability", "confidence", "flaggedSentences", "analysis"],
} as const;

// We dynamically pull the model name, defaulting to the highly efficient Flash model
export const MODEL_NAME = process.env.GEMINI_MODEL || "gemini-3-flash";
