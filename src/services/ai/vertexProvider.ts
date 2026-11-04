// Vertex AI provider for the Vercel AI SDK.
//
// The import of "./geminiClient" is a side-effect import: it writes the
// GCP_SERVICE_ACCOUNT_JSON env var to a temp file and sets
// GOOGLE_APPLICATION_CREDENTIALS so that @ai-sdk/google-vertex (which uses
// google-auth-library under the hood) can authenticate with the same
// service-account credentials already used by @google/genai.
import "./geminiClient";

import { createGoogleVertex } from "@ai-sdk/google-vertex";

export const vertex = createGoogleVertex({
  project: process.env.GCP_PROJECT_ID!,
  location: "global",
});
