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

// ── Colour helpers ────────────────────────────────────────────────────────────

function scoreColor(p: number) {
  if (p >= 75)
    return {
      text: "text-red-600",
      bg: "bg-red-50",
      ring: "ring-red-200",
      bar: "bg-red-500",
      stroke: "#ef4444",
      glow: "shadow-red-100",
      badge: "bg-red-100 text-red-700 border-red-200",
      cta: "bg-red-600 hover:bg-red-700 shadow-red-100",
    };
  if (p >= 45)
    return {
      text: "text-amber-600",
      bg: "bg-amber-50",
      ring: "ring-amber-200",
      bar: "bg-amber-500",
      stroke: "#f59e0b",
      glow: "shadow-amber-100",
      badge: "bg-amber-100 text-amber-700 border-amber-200",
      cta: "bg-amber-600 hover:bg-amber-700 shadow-amber-100",
    };
  return {
    text: "text-emerald-600",
    bg: "bg-emerald-50",
    ring: "ring-emerald-200",
    bar: "bg-emerald-500",
    stroke: "#10b981",
    glow: "shadow-emerald-100",
    badge: "bg-emerald-100 text-emerald-700 border-emerald-200",
    cta: "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-100",
  };
}

function scoreLabel(p: number) {
  if (p >= 75) return "Likely AI-Generated";
  if (p >= 45) return "Uncertain — Mixed Signals";
  return "Likely Human-Written";
}

function scoreIcon(p: number) {
  if (p >= 75) return <ShieldAlert className="h-5 w-5" />;
  if (p >= 45) return <Brain className="h-5 w-5" />;
  return <ShieldCheck className="h-5 w-5" />;
}

// ── Progress ring ─────────────────────────────────────────────────────────────

function ProgressRing({
  percent,
  stroke,
  size = 160,
  strokeWidth = 12,
}: {
  percent: number;
  stroke: string;
  size?: number;
  strokeWidth?: number;
}) {
  const r = (size - strokeWidth) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (percent / 100) * circ;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className="-rotate-90"
      aria-hidden="true"
    >
      {/* Track */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        className="text-slate-100"
      />
      {/* Progress */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={stroke}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={offset}
        style={{ transition: "stroke-dashoffset 0.8s cubic-bezier(0.4,0,0.2,1)" }}
      />
    </svg>
  );
}

// ── Metric pill ───────────────────────────────────────────────────────────────

function MetricPill({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="flex flex-col gap-0.5 rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5 text-center">
      <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">
        {label}
      </span>
      <span className="text-sm font-bold capitalize text-slate-900">{value}</span>
      {hint && <span className="text-[9px] text-slate-400">{hint}</span>}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function DetectorPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialText = searchParams.get("text");
  const fromHome = searchParams.get("fromHome") === "1";

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
    try {
      sessionStorage.setItem("humanize_prefill_text", text);
      if (data?.documentId) {
        sessionStorage.setItem("humanize_prefill_docId", data.documentId);
      }
    } catch { /* ignore */ }

    const params = new URLSearchParams({ fromHistory: "1" });
    if (data?.documentId) params.set("documentId", data.documentId);
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
  const pct = data ? Math.round(data.aiProbability) : 0;

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:space-y-8 sm:p-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          AI Content Detector
        </h1>
        <p className="mt-2 text-sm text-slate-500 sm:text-base">
          Paste or upload text to detect AI-generated patterns, flagged
          sentences, and a detailed forensic breakdown.
        </p>
      </header>

      <div className="grid items-start gap-6 sm:gap-8 lg:grid-cols-2">
        {/* ── Input panel ── */}
        <section className="space-y-4">
          <TextUploadField
            value={text}
            onChange={setText}
            placeholder="Paste or drop your text here..."
            minHeightClassName="min-h-[320px] sm:min-h-[380px]"
          />

          <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3">
            <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">
              {wordCount} {wordCount === 1 ? "word" : "words"}
            </span>
            <button
              onClick={handleScan}
              disabled={isPending || wordCount < 50}
              className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-indigo-100 transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
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
        <section className="flex min-h-[420px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm sm:min-h-[520px]">

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

          {/* Loading state — preserved exactly as requested */}
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

          {/* ── Results ── */}
          {data && colors && (
            <div className="flex h-full flex-col">

              {/* Score header — progress ring + metrics */}
              <div className={`border-b border-slate-100 p-5 sm:p-6 ${colors.bg}`}>
                <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start sm:gap-6">

                  {/* Progress ring */}
                  <div className="relative shrink-0">
                    <ProgressRing
                      percent={pct}
                      stroke={colors.stroke}
                      size={148}
                      strokeWidth={13}
                    />
                    {/* Centre label */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className={`text-4xl font-black tabular-nums leading-none ${colors.text}`}>
                        {pct}
                        <span className="text-xl">%</span>
                      </span>
                      <span className="mt-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                        AI Score
                      </span>
                    </div>
                  </div>

                  {/* Right side */}
                  <div className="flex flex-1 flex-col gap-3 text-center sm:text-left">
                    {/* Verdict badge */}
                    <div
                      className={`inline-flex items-center gap-1.5 self-center rounded-full border px-3 py-1.5 text-xs font-bold sm:self-start ${colors.badge}`}
                    >
                      {scoreIcon(pct)}
                      {scoreLabel(pct)}
                    </div>

                    {/* Metric pills */}
                    <div className="grid grid-cols-2 gap-2">
                      <MetricPill
                        label="Confidence"
                        value={data.confidence}
                      />
                      <MetricPill
                        label="Flagged"
                        value={`${data.flaggedSentences?.length ?? 0} sentences`}
                      />
                      <MetricPill
                        label="Words"
                        value={wordCount}
                      />
                      <MetricPill
                        label="Model"
                        value="Pro"
                        hint="Humanica Pro"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Annotated text + analysis */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6">
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

                {/* Legend */}
                <div className="mt-4 flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-2.5">
                  <span className="inline-block h-3 w-3 rounded-sm bg-red-100 ring-1 ring-red-300" />
                  <span className="text-[11px] text-slate-500">
                    Highlighted sentences are flagged as likely AI-generated
                  </span>
                </div>
              </div>

              {/* CTA */}
              <div className="border-t border-slate-100 bg-white p-4">
                <button
                  onClick={handleRedirectToHumanizer}
                  className={`flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl px-4 py-3.5 font-bold text-white shadow-lg transition ${colors.cta}`}
                >
                  <Sparkles size={18} />
                  Humanize this text
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
