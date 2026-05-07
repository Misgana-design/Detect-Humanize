"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  Brain,
  ChevronRight,
  Loader2,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";
import { TextUploadField } from "@/components/forms/TextUploadField";
import { useDetection } from "@/hooks/useDetection";

// Colour helpers based on AI probability score
function scoreColor(p: number) {
  if (p >= 75) return { text: "text-red-600",    bg: "bg-red-50",    ring: "ring-red-200",    bar: "bg-red-500"    };
  if (p >= 45) return { text: "text-amber-600",  bg: "bg-amber-50",  ring: "ring-amber-200",  bar: "bg-amber-500"  };
  return              { text: "text-emerald-600", bg: "bg-emerald-50",ring: "ring-emerald-200",bar: "bg-emerald-500" };
}

function scoreLabel(p: number) {
  if (p >= 75) return "Likely AI-Generated";
  if (p >= 45) return "Uncertain — Mixed Signals";
  return "Likely Human-Written";
}

function scoreIcon(p: number) {
  if (p >= 75) return <ShieldAlert className="h-6 w-6" />;
  if (p >= 45) return <Brain className="h-6 w-6" />;
  return <ShieldCheck className="h-6 w-6" />;
}

export function DetectorPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialText = searchParams.get("text");
  const fromHome = searchParams.get("fromHome") === "1";

  // For long texts from the homepage, read from sessionStorage instead of URL
  const resolveInitialText = () => {
    if (fromHome) {
      try {
        const stored = sessionStorage.getItem("detector_prefill_text");
        if (stored) {
          sessionStorage.removeItem("detector_prefill_text");
          return stored;
        }
      } catch { /* ignore */ }
    }
    return initialText ? decodeURIComponent(initialText) : "";
  };

  const [text, setText] = useState(() => resolveInitialText());
  const { mutate, data, isPending, error } = useDetection();

  const wordCount = useMemo(
    () => (text.trim() === "" ? 0 : text.trim().split(/\s+/).length),
    [text],
  );

  const handleScan = () => mutate(text);

  const handleRedirectToHumanizer = () => {
    // Use sessionStorage for long texts to avoid URL length limits
    try {
      sessionStorage.setItem("humanize_prefill_text", text);
      if (data?.documentId) {
        sessionStorage.setItem("humanize_prefill_docId", data.documentId);
      }
    } catch { /* ignore */ }

    const params = new URLSearchParams({ fromHistory: "1" });
    if (data?.documentId) params.set("documentId", data.documentId);
    // Also put short texts in URL as fallback
    if (text.length < 1500) params.set("text", text);
    router.push(`/humanize?${params.toString()}`);
  };

  const renderHighlightedText = (content: string, flagged: string[]) => {
    if (!flagged || flagged.length === 0) return <span>{content}</span>;
    const segments = content.split(/([.!?]+[\s\n]+)/);
    return (
      <>
        {segments.map((segment, i) => {
          const isFlagged = flagged.some(
            (s) => s.includes(segment.trim()) && segment.trim().length > 10,
          );
          return (
            <span
              key={i}
              className={
                isFlagged
                  ? "rounded bg-red-100 px-0.5 text-red-900 underline decoration-red-300 decoration-wavy"
                  : ""
              }
            >
              {segment}
            </span>
          );
        })}
      </>
    );
  };

  const colors = data ? scoreColor(data.aiProbability) : null;

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-6">
      <header>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">
          AI Content Detector
        </h1>
        <p className="mt-2 text-slate-500">
          Paste or upload text to detect AI-generated patterns, flagged
          sentences, and a detailed forensic breakdown.
        </p>
      </header>

      <div className="grid items-start gap-8 lg:grid-cols-2">
        {/* ── Input panel ── */}
        <section className="space-y-4">
          <TextUploadField
            value={text}
            onChange={setText}
            placeholder="Paste or drop your text here..."
            minHeightClassName="min-h-[380px]"
          />

          <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3">
            <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">
              {wordCount} {wordCount === 1 ? "word" : "words"}
            </span>
            <button
              onClick={handleScan}
              disabled={isPending || wordCount < 50}
              className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-indigo-100 transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Zap className="h-4 w-4" />
              )}
              {isPending ? "Analyzing..." : "Analyze Content"}
            </button>
          </div>

          {error && (
            <div className="flex items-center gap-2 rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-700">
              <AlertCircle size={16} className="shrink-0" />
              {error.message}
            </div>
          )}
        </section>

        {/* ── Results panel ── */}
        <section className="flex min-h-168 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          {/* Empty state */}
          {!data && !isPending && (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 p-10 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50 shadow-inner">
                <Zap className="h-8 w-8 text-slate-200" />
              </div>
              <div>
                <p className="font-semibold text-slate-700">No analysis yet</p>
                <p className="mt-1 text-sm text-slate-400">
                  Paste at least 50 words and click Analyze Content.
                </p>
              </div>
            </div>
          )}

          {/* Loading state */}
          {isPending && (
            <div className="flex flex-1 flex-col items-center justify-center gap-6 p-10 text-center">
              <div className="relative flex h-20 w-20 items-center justify-center">
                <div className="absolute inset-0 animate-ping rounded-full bg-indigo-100" />
                <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-indigo-600 shadow-lg shadow-indigo-200">
                  <Brain className="h-8 w-8 text-white" />
                </div>
              </div>
              <div>
                <p className="font-bold text-indigo-700">
                  Scanning for AI patterns...
                </p>
                <p className="mt-1 text-sm text-slate-400">
                  Running linguistic forensic analysis
                </p>
              </div>
              <div className="w-48 space-y-2 text-left text-xs text-slate-400">
                {[
                  "Tokenizing text",
                  "Checking burstiness",
                  "Scoring perplexity",
                  "Flagging sentences",
                ].map((step, i) => (
                  <div key={step} className="flex items-center gap-2">
                    <Loader2
                      className="h-3 w-3 animate-spin text-indigo-400"
                      style={{ animationDelay: `${i * 150}ms` }}
                    />
                    {step}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Results */}
          {data && colors && (
            <div className="flex h-full flex-col">
              {/* Score header */}
              <div className={`border-b border-slate-100 p-6 ${colors.bg}`}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
                      AI Probability Score
                    </p>
                    <div
                      className={`mt-1 text-6xl font-black tabular-nums ${colors.text}`}
                    >
                      {Math.round(data.aiProbability)}
                      <span className="text-3xl">%</span>
                    </div>
                    <div
                      className={`mt-2 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold ring-1 ${colors.text} ${colors.ring} bg-white`}
                    >
                      {scoreIcon(data.aiProbability)}
                      {scoreLabel(data.aiProbability)}
                    </div>
                  </div>

                  {/* Confidence badge */}
                  <div className="shrink-0 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-center shadow-sm">
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
                      Confidence
                    </p>
                    <p className="mt-1 text-lg font-bold capitalize text-slate-900">
                      {data.confidence}
                    </p>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="mt-4 h-2 w-full overflow-hidden rounded-full bg-white/60">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${colors.bar}`}
                    style={{ width: `${Math.round(data.aiProbability)}%` }}
                  />
                </div>
              </div>

              {/* Flagged text */}
              <div className="flex-1 overflow-y-auto p-6">
                <p className="mb-3 text-[10px] font-black uppercase tracking-widest text-slate-400">
                  Annotated Text
                  {data.flaggedSentences?.length > 0 && (
                    <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-red-600">
                      {data.flaggedSentences.length} flagged
                    </span>
                  )}
                </p>
                <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-sm leading-7 text-slate-800 shadow-inner">
                  {renderHighlightedText(text, data.flaggedSentences || [])}
                </div>

                {data.analysis && (
                  <div className="mt-4 rounded-xl border border-slate-100 bg-white p-4">
                    <p className="mb-1 text-[10px] font-black uppercase tracking-widest text-slate-400">
                      Forensic Analysis
                    </p>
                    <p className="text-xs leading-6 text-slate-600">
                      {data.analysis}
                    </p>
                  </div>
                )}
              </div>

              {/* CTA */}
              <div className="border-t border-slate-100 bg-white p-4">
                <button
                  onClick={handleRedirectToHumanizer}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-3.5 font-bold text-white shadow-lg shadow-emerald-100 transition hover:bg-emerald-700 hover:cursor-pointer"
                >
                  <Sparkles size={18} />
                  Improve with Humanizer
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
