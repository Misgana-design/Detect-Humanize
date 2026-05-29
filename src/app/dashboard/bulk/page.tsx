"use client";

import { useState } from "react";
import Link from "next/link";
import { AlertCircle, Check, Copy, Lock, Plus, Sparkles, Trash2 } from "lucide-react";
import { useProfile } from "@/hooks/userProfile";
import { LanguageSelect } from "@/components/workspace/LanguageSelect";
import { exportJson, exportMarkdown } from "@/lib/clientExports";
import { type SupportedLanguage } from "@/lib/languages";
import { type Tone } from "@/services/ai/humanizerService";

type BatchItem = {
  id: string;
  text: string;
  tone: Tone;
  language: SupportedLanguage;
};

type BatchResult =
  | { id?: string; humanizedText: string; changes: string[]; cached: boolean }
  | { id?: string; error: string };

const TONES: Tone[] = [
  "casual",
  "professional",
  "academic",
  "formal",
  "creative",
  "friendly",
  "storytelling",
];

function createItem(index: number): BatchItem {
  return {
    id: `Item ${index}`,
    text: "",
    tone: "casual",
    language: "auto",
  };
}

export default function BulkHumanizerPage() {
  const { data: profile } = useProfile();
  const [items, setItems] = useState<BatchItem[]>([createItem(1), createItem(2)]);
  const [results, setResults] = useState<BatchResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const isUltra = profile?.subscription_tier === "ultra";

  const updateItem = (id: string, patch: Partial<BatchItem>) => {
    setItems((current) =>
      current.map((item) => (item.id === id ? { ...item, ...patch } : item)),
    );
  };

  const addItem = () => {
    if (items.length < 10) setItems((current) => [...current, createItem(current.length + 1)]);
  };

  const removeItem = (id: string) => {
    setItems((current) => current.filter((item) => item.id !== id));
  };

  const runBatch = async () => {
    setError(null);
    setResults([]);
    setIsPending(true);
    try {
      const response = await fetch("/api/humanize/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: items
            .filter((item) => item.text.trim())
            .map((item) => ({
              id: item.id,
              text: item.text,
              tone: item.tone,
              language: item.language,
            })),
        }),
      });
      const payload = (await response.json()) as { results?: BatchResult[]; error?: string };
      if (!response.ok || !payload.results) {
        throw new Error(payload.error || "Batch processing failed.");
      }
      setResults(payload.results);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Batch processing failed.");
    } finally {
      setIsPending(false);
    }
  };

  const exportResults = () => {
    const successful = results.filter((result): result is Extract<BatchResult, { humanizedText: string }> => "humanizedText" in result);
    exportMarkdown({
      title: "Bulk Humanized Outputs",
      body: successful
        .map((result) => `## ${result.id ?? "Untitled"}\n\n${result.humanizedText}`)
        .join("\n\n"),
    });
  };

  if (!isUltra) {
    return (
      <div className="mx-auto max-w-3xl rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-50">
          <Lock className="h-7 w-7 text-indigo-500" />
        </div>
        <h1 className="mt-5 text-2xl font-bold text-slate-900">Bulk processing is an Ultra feature</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          Process up to 10 drafts at once, keep item-level errors isolated, and export the full batch.
        </p>
        <Link
          href="/pricing"
          className="mt-6 inline-flex items-center justify-center rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white transition hover:bg-indigo-700"
        >
          View Ultra plan
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Bulk Humanizer</h1>
          <p className="mt-1 text-sm text-slate-500">
            Humanize up to 10 drafts in one run. Each item can use its own tone and language.
          </p>
        </div>
        <button
          onClick={addItem}
          disabled={items.length >= 10}
          className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
        >
          <Plus size={16} />
          Add item
        </button>
      </header>

      <div className="grid gap-4">
        {items.map((item, index) => (
          <section key={item.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <input
                value={item.id}
                onChange={(event) => updateItem(item.id, { id: event.target.value || `Item ${index + 1}` })}
                className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-indigo-200"
              />
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={item.tone}
                  onChange={(event) => updateItem(item.id, { tone: event.target.value as Tone })}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 outline-none"
                >
                  {TONES.map((tone) => (
                    <option key={tone} value={tone}>
                      {tone}
                    </option>
                  ))}
                </select>
                <LanguageSelect
                  value={item.language}
                  onChange={(language) => updateItem(item.id, { language })}
                  compact
                />
                <button
                  onClick={() => removeItem(item.id)}
                  disabled={items.length === 1}
                  className="rounded-xl p-2 text-slate-400 transition hover:bg-rose-50 hover:text-rose-500 disabled:opacity-40"
                  aria-label="Remove item"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
            <textarea
              value={item.text}
              onChange={(event) => updateItem(item.id, { text: event.target.value })}
              placeholder="Paste text for this item..."
              className="min-h-40 w-full resize-y rounded-xl border border-slate-200 p-4 text-sm leading-6 text-slate-800 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
            />
          </section>
        ))}
      </div>

      <div className="sticky bottom-4 z-10 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-lg backdrop-blur sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs font-semibold text-slate-500">
          {items.filter((item) => item.text.trim()).length} ready item(s), maximum 10 per batch.
        </p>
        <div className="flex gap-2">
          {results.length > 0 && (
            <>
              <button
                onClick={exportResults}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
              >
                <Copy size={15} />
                Export MD
              </button>
              <button
                onClick={() => exportJson("bulk-humanizer-results", results)}
                className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 transition hover:bg-slate-50"
              >
                <Copy size={15} />
                Export JSON
              </button>
            </>
          )}
          <button
            onClick={runBatch}
            disabled={isPending || items.every((item) => !item.text.trim())}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-indigo-100 transition hover:bg-indigo-700 disabled:opacity-60"
          >
            <Sparkles size={16} />
            {isPending ? "Processing..." : "Run batch"}
          </button>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {results.length > 0 && (
        <div className="grid gap-4">
          {results.map((result, index) => (
            <section key={`${result.id}-${index}`} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              {"error" in result ? (
                <div className="flex items-start gap-3 text-rose-700">
                  <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  <div>
                    <p className="font-bold">{result.id ?? `Item ${index + 1}`}</p>
                    <p className="text-sm">{result.error}</p>
                  </div>
                </div>
              ) : (
                <>
                  <div className="mb-3 flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-500" />
                    <h2 className="font-bold text-slate-900">{result.id ?? `Item ${index + 1}`}</h2>
                    {result.cached && (
                      <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-500">
                        cached
                      </span>
                    )}
                  </div>
                  <p className="whitespace-pre-wrap rounded-xl border border-slate-100 bg-slate-50 p-4 text-sm leading-7 text-slate-800">
                    {result.humanizedText}
                  </p>
                </>
              )}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
