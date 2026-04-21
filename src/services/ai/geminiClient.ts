// geminiClient.ts
import { GoogleGenAI } from "@google/genai";
import fs from "node:fs"; // ← Added for /tmp file creation

// === Runtime setup for GOOGLE_APPLICATION_CREDENTIALS (Vercel + local) ===
if (
  process.env.GCP_SERVICE_ACCOUNT_JSON &&
  !process.env.GOOGLE_APPLICATION_CREDENTIALS
) {
  const credentialsPath = "/tmp/gcp-service-account.json";

  // Write the JSON string to a temp file
  fs.writeFileSync(
    credentialsPath,
    process.env.GCP_SERVICE_ACCOUNT_JSON,
    "utf-8",
  );

  // Tell Google SDK where to find the credentials
  process.env.GOOGLE_APPLICATION_CREDENTIALS = credentialsPath;

  console.log(
    "✅ GOOGLE_APPLICATION_CREDENTIALS set from GCP_SERVICE_ACCOUNT_JSON (Vercel mode)",
  );
}

// 1. Initialize using GoogleGenAI (now uses ADC via GOOGLE_APPLICATION_CREDENTIALS)
export const client = new GoogleGenAI({
  project: process.env.GCP_PROJECT_ID!,
  location: "global",
  vertexai: true, // Required to use Vertex AI & $300 credits
  // ← NO googleAuthOptions needed anymore
});

// 2. Detection Schema
export const detectionSchema = {
  type: "OBJECT",
  properties: {
    aiProbability: { type: "NUMBER" },
    confidence: { type: "STRING" },
    flaggedSentences: { type: "ARRAY", items: { type: "STRING" } },
    analysis: { type: "STRING" },
  },
  required: ["aiProbability", "confidence", "flaggedSentences", "analysis"],
};

// 3. Humanizer Schema
export const humanizerSchema = {
  type: "OBJECT",
  properties: {
    humanizedText: { type: "STRING" },
    changes: { type: "ARRAY", items: { type: "STRING" } },
  },
  required: ["humanizedText", "changes"],
};

export const MODELS = {
  FREE: "gemini-3-flash-preview",
  PRO: "gemini-3.1-pro-preview",
};
