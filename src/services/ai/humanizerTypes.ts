// Shared types for the humanizer pipeline.
// Kept in a dedicated file so they can be imported by any service or UI layer
// without pulling in the full service implementation.

export type Tone =
  | "standard"
  | "casual"
  | "professional"
  | "academic"
  | "formal"
  | "creative"
  | "friendly"
  | "storytelling";

export type HumanizerTier = "free" | "basic" | "pro";

export interface HumanizerResult {
  humanizedText: string;
  changes: string[];
}
