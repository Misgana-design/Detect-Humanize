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
      bg: "from-red-50 to-rose-50",
      headerBg: "bg-gradient-to-br from-red-50 to-rose-50",
      stroke: "#ef4444",
      strokeLight: "#fca5a5",
      badge: "bg-red-100 text-red-700 border-red-200",
      cta: "bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 shadow-red-200",
      ring: "ring-red-200",
      glow: "shadow-red-100",
      analysisBg: "bg-red-50 border-red-100",
      analysisText: "text-red-800",
      analysisLabel: "text-red-500",
    };
  if (p >= 45)
    return {
      text: "text-amber-600",
      bg: "from-amber-50 to-yellow-50",
      headerBg: "bg-gradient-to-br from-amber-50 to-yellow-50",
      stroke: "#f59e0b",
      strokeLight: "#fcd34d",
      badge: "bg-amber-100 text-amber-700 border-amber-200",
      cta: "bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 shadow-amber-200",
      ring: "ring-amber-200",
      glow: "shadow-amber-100",
      analysisBg: "bg-amber-50 border-amber-100",
      analysisText: "text-amber-900",
      analysisLabel: "text-amber-500",
    };
  return {
    text: "text-emerald-600",
    bg: "from-emerald-50 to-teal-50",
    headerBg: "bg-gradient-to-br from-emerald-50 to-teal-50",
    stroke: "#10b981",
    strokeLight: "#6ee7b7",
    badge: "bg-emerald-100 text-emerald-700 border-emerald-200",
    cta: "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 shadow-emerald-200",
    ring: "ring-emerald-200",
    glow: "shadow-emerald-100",
    analysisBg: "bg-emerald-50 border-emerald-100",
    analysisText: "text-emerald-900",
    analysisLabel: "text-emerald-500",
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
  strokeLight,
  size = 140,
  strokeWidth = 14,
}: {
  percent: number;
  stroke: string;
  strokeLight: string;
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
      className="-rotate-90 drop-shadow-sm"
      aria-hidden="true"
    >
      {/* Outer glow track */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={strokeLight}
        strokeWidth={strokeWidth + 4}
        opacity={0.2}
      />
      {/* Track */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke="#e2e8f0"
        strokeWidth={strokeWidth}
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
        style={{ transition: "stroke-dashoffset 1s cubic-bezier(0.4,0,0.2,1)" }}
      />
    </svg>
  );
}

function scoreBand(p: number) {
  if (p >= 75) return "High AI signal";
  if (p >= 45) return "Mixed signal";
  return "Low AI signal";
}

function formatAnalysis(analysis: string) {
  return analysis
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .filter(Boolean);
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
  const analysisBlocks = data?.analysis ? formatAnalysis(data.analysis) : [];

  // Panel height matches the input area (textarea + action bar)
  const PANEL_HEIGHT = "h-[calc(380px+56px)]";

  return (
    <div className="mx-auto max-w-6xl space-y-6 px-4 py-6 sm:space-y-8 sm:p-6">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          AI Content Detector
        </h1>
        <p className="mt-2 text-sm text-slate-500 sm:text-base">
          Paste or upload text to detect AI-generated patterns, flagged sentences, and a detailed forensic breakdown.
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
              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
              {isPending ? "Analyzing..." : "Analyze Content"}
            </button>
          </div>
          {error && (
            <div className="overflow-hidden rounded-2xl border border-red-200 bg-white shadow-sm">
              {/* Top accent */}
              <div className="h-1 w-full bg-gradient-to-r from-red-500 to-rose-500" />
              <div className="p-5">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-100">
                    <AlertCircle size={18} className="text-red-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-slate-900">Analysis failed</p>
                    <p className="mt-1 text-sm leading-6 text-slate-600">
                      {error.message}
                    </p>
                    <button
                      onClick={handleScan}
                      disabled={isPending || wordCount < 50}
                      className="mt-3 inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-red-600 px-3.5 py-1.5 text-xs font-bold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Zap size={12} /> Try again
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* ── Results panel — fixed height, internal scroll ── */}
        <section className={`flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm ${PANEL_HEIGHT}`}>

          {/* Empty state */}
          {!data && !isPending && (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 p-10 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50 shadow-inner">
                <Zap className="h-8 w-8 text-slate-200" />
              </div>
              <div>
                <p className="font-semibold text-slate-700">No analysis yet</p>
                <p className="mt-1 text-sm text-slate-400">Paste at least 50 words and click Analyze Content.</p>
              </div>
            </div>
          )}

          {/* Loading state — preserved exactly */}
          {isPending && (
            <div className="flex flex-1 flex-col items-center justify-center gap-6 p-10 text-center">
              <div className="relative flex h-20 w-20 items-center justify-center">
                <div className="absolute inset-0 animate-ping rounded-full bg-indigo-100" />
                <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-indigo-600 shadow-lg shadow-indigo-200">
                  <Brain className="h-8 w-8 text-white" />
                </div>
              </div>
              <div>
                <p className="font-bold text-indigo-700">Scanning for AI patterns...</p>
                <p className="mt-1 text-sm text-slate-400">Running linguistic forensic analysis</p>
              </div>
              <div className="w-48 space-y-2 text-left text-xs text-slate-400">
                {["Tokenizing text", "Checking burstiness", "Scoring perplexity", "Flagging sentences"].map((step, i) => (
                  <div key={step} className="flex items-center gap-2">
                    <Loader2 className="h-3 w-3 animate-spin text-indigo-400" style={{ animationDelay: `${i * 150}ms` }} />
                    {step}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ── Results ── */}
          {data && colors && (
            <div className="flex h-full min-h-0 flex-col">

              {/* Score header */}
              <div className={`shrink-0 border-b border-slate-100 px-5 py-4 ${colors.headerBg}`}>
                <div className="flex items-center gap-5">
                  {/* Progress ring */}
                  <div className="relative shrink-0">
                    <ProgressRing
                      percent={pct}
                      stroke={colors.stroke}
                      strokeLight={colors.strokeLight}
                      size={120}
                      strokeWidth={13}
                    />
                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                      <span className={`text-3xl font-black tabular-nums leading-none ${colors.text}`}>
                        {pct}<span className="text-lg">%</span>
                      </span>
                      <span className="mt-0.5 text-[9px] font-bold uppercase tracking-widest text-slate-400">AI Score</span>
                    </div>
                  </div>

                  {/* Right side */}
                  <div className="flex flex-1 flex-col gap-2.5">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className={`inline-flex w-fit items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold ${colors.badge}`}>
                        {scoreIcon(pct)}
                        {scoreLabel(pct)}
                      </div>
                      <span className="rounded-full border border-white/80 bg-white/75 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-slate-500 shadow-sm">
                        {scoreBand(pct)}
                      </span>
                    </div>
                    <div>
                      <div className="h-2 overflow-hidden rounded-full bg-white/80 shadow-inner">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{
                            width: `${pct}%`,
                            background: `linear-gradient(90deg, ${colors.strokeLight}, ${colors.stroke})`,
                          }}
                        />
                      </div>
                      <div className="mt-1 flex justify-between text-[9px] font-bold uppercase tracking-widest text-slate-400">
                        <span>Human</span>
                        <span>Mixed</span>
                        <span>AI</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      {[
                        { label: "Confidence", value: data.confidence },
                        { label: "Flagged", value: `${data.flaggedSentences?.length ?? 0} sentences` },
                        { label: "Words", value: wordCount },
                        { label: "Model", value: "Pro" },
                      ].map((m) => (
                        <div key={m.label} className="rounded-lg border border-white/80 bg-white/70 px-2.5 py-1.5 text-center backdrop-blur-sm">
                          <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">{m.label}</p>
                          <p className="text-xs font-bold capitalize text-slate-800">{m.value}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Scrollable body */}
              <div className="min-h-0 flex-1 overflow-y-auto">
                {/* Annotated text */}
                <div className="p-4">
                  <p className="mb-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Annotated Text
                    {data.flaggedSentences?.length > 0 && (
                      <span className="ml-2 rounded-full bg-red-100 px-2 py-0.5 text-red-600">
                        {data.flaggedSentences.length} flagged
                      </span>
                    )}
                  </p>
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-3.5 text-sm leading-7 text-slate-800 shadow-inner">
                    {renderHighlightedText(text, data.flaggedSentences || [])}
                  </div>
                  <div className="mt-2 flex items-center gap-2 text-[11px] text-slate-400">
                    <span className="inline-block h-2.5 w-2.5 rounded-sm bg-red-100 ring-1 ring-red-300" />
                    Highlighted = likely AI-generated
                  </div>
                </div>

                {/* Forensic analysis — eye-catching card */}
                {data.analysis && (
                  <div className={`mx-4 mb-4 overflow-hidden rounded-xl border ${colors.analysisBg}`}>
                    <div className="flex items-center justify-between gap-3 border-b border-white/70 bg-white/45 px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className={`flex h-8 w-8 items-center justify-center rounded-lg ${colors.badge}`}>
                          <Brain size={15} />
                        </div>
                        <div>
                          <p className={`text-[10px] font-black uppercase tracking-widest ${colors.analysisLabel}`}>
                            Forensic Analysis
                          </p>
                          <p className="text-[11px] font-medium text-slate-500">
                            Burstiness, perplexity, rhythm, and humanized traits
                          </p>
                        </div>
                      </div>
                      <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-widest ${colors.badge}`}>
                        {data.confidence}
                      </span>
                    </div>
                    <div className="space-y-3 p-4">
                      {analysisBlocks.map((block, index) => (
                        <div key={`${block.slice(0, 24)}-${index}`} className="flex gap-3">
                          <div className={`mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-black ${colors.badge}`}>
                            {index + 1}
                          </div>
                          <p className={`text-xs leading-6 ${colors.analysisText}`}>
                            {block}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* CTA — pinned to bottom */}
              <div className="shrink-0 border-t border-slate-100 bg-white p-3">
                <button
                  onClick={handleRedirectToHumanizer}
                  className={`flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-bold text-white shadow-lg transition ${colors.cta}`}
                >
                  <Sparkles size={16} />
                  Humanize this text
                  <ChevronRight size={15} />
                </button>
              </div>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
