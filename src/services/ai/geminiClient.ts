import { VertexAI, SchemaType } from "@google-cloud/vertexai";

// 1. Initialize the Vertex AI client for your GCP Project
// This will automatically use the JSON key from GOOGLE_APPLICATION_CREDENTIALS
export const vertex_ai = new VertexAI({
  project: process.env.GCP_PROJECT_ID!,
  location: "us-central1",
});

// 2. Detection Schema (Vertex AI compatible)
export const detectionSchema = {
  type: SchemaType.OBJECT,
  properties: {
    aiProbability: {
      type: SchemaType.NUMBER,
      description: "0 to 100 probability of AI generation",
    },
    confidence: {
      type: SchemaType.STRING,
      description: "low, medium, or high",
    },
    flaggedSentences: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
      description: "Exact sentences that appear AI-generated",
    },
    analysis: {
      type: SchemaType.STRING,
      description: "Brief reasoning for the score",
    },
  },
  required: ["aiProbability", "confidence", "flaggedSentences", "analysis"],
};

// 3. Humanizer Schema
export const humanizerSchema = {
  type: SchemaType.OBJECT,
  properties: {
    humanizedText: {
      type: SchemaType.STRING,
      description: "The rewritten, natural-sounding text.",
    },
    changes: {
      type: SchemaType.ARRAY,
      items: { type: SchemaType.STRING },
      description: "3-5 key structural or tonal changes made.",
    },
  },
  required: ["humanizedText", "changes"],
};

// 4. Standard Model Names for 2026 logic
// We keep these strings here so you only change them in one place
export const MODELS = {
  FREE: "gemini-3-flash-preview", // High speed / low cost
  PRO: "gemini-3.1-pro-preview", // Deep reasoning / agentic
};
