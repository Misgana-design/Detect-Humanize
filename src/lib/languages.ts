export type SupportedLanguage =
  | "auto"
  | "en"
  | "es"
  | "fr"
  | "de"
  | "it"
  | "pt"
  | "nl"
  | "ar"
  | "am"
  | "hi"
  | "zh"
  | "ja"
  | "ko";

export type LanguageOption = {
  code: SupportedLanguage;
  label: string;
  promptLabel: string;
};

export const LANGUAGE_OPTIONS: LanguageOption[] = [
  { code: "auto", label: "Auto-detect", promptLabel: "the source language" },
  { code: "en", label: "English", promptLabel: "English" },
  { code: "es", label: "Spanish", promptLabel: "Spanish" },
  { code: "fr", label: "French", promptLabel: "French" },
  { code: "de", label: "German", promptLabel: "German" },
  { code: "it", label: "Italian", promptLabel: "Italian" },
  { code: "pt", label: "Portuguese", promptLabel: "Portuguese" },
  { code: "nl", label: "Dutch", promptLabel: "Dutch" },
  { code: "ar", label: "Arabic", promptLabel: "Arabic" },
  { code: "am", label: "Amharic", promptLabel: "Amharic" },
  { code: "hi", label: "Hindi", promptLabel: "Hindi" },
  { code: "zh", label: "Chinese", promptLabel: "Chinese" },
  { code: "ja", label: "Japanese", promptLabel: "Japanese" },
  { code: "ko", label: "Korean", promptLabel: "Korean" },
];

export function normalizeLanguage(value: unknown): SupportedLanguage {
  return LANGUAGE_OPTIONS.some((option) => option.code === value)
    ? (value as SupportedLanguage)
    : "auto";
}

export function getLanguageLabel(code: string | null | undefined): string {
  return LANGUAGE_OPTIONS.find((option) => option.code === code)?.label ?? "Auto-detect";
}

export function getLanguagePromptLabel(code: string | null | undefined): string {
  return LANGUAGE_OPTIONS.find((option) => option.code === code)?.promptLabel ?? "the source language";
}
