"use client";

import { Languages } from "lucide-react";
import {
  LANGUAGE_OPTIONS,
  type SupportedLanguage,
} from "@/lib/languages";

type Props = {
  value: SupportedLanguage;
  onChange: (language: SupportedLanguage) => void;
  compact?: boolean;
};

export function LanguageSelect({ value, onChange, compact = false }: Props) {
  return (
    <label className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-600 shadow-sm">
      <Languages className="h-4 w-4 text-indigo-500" />
      <span className={compact ? "sr-only" : "text-xs font-bold uppercase tracking-widest text-slate-400"}>
        Language
      </span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value as SupportedLanguage)}
        className="bg-transparent text-sm font-semibold text-slate-700 outline-none"
      >
        {LANGUAGE_OPTIONS.map((language) => (
          <option key={language.code} value={language.code}>
            {language.label}
          </option>
        ))}
      </select>
    </label>
  );
}
