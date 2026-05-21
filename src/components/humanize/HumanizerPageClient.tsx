"use client";

import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { AlertCircle, Check, Copy, FileText, Lock, Sparkles, Zap } from "lucide-react";
import { TextUploadField } from "@/components/forms/TextUploadField";
import { useHumanizer } from "@/hooks/useHumanizer";
import { useProfile } from "@/hooks/userProfile";
import { type Tone } from "@/services/ai/humanizerService";

type ToneOption = { value: Tone; label: string; proOnly: boolean };

const TONES: ToneOption[] = [
  { value: "casual",       label: "Casual",        proOnly: false },
  { value: "professional", label: "Professional",  proOnly: true  },
  { value: "academic",     label: "Academic",      proOnly: true  },
  { value: "formal",       label: "Formal",        proOnly: true  },
  { value: "creative",     label: "Creative",      proOnly: true  },
  { value: "friendly",     label: "Friendly",      proOnly: true  },
  { value: "storytelling", label: "Storytelling",  proOnly: true  },
];

const FREE_STAGES = [
  { label: "Rewriting text", detail: "Applying humanization rules..." },
];
const PAID_STAGES = [
  { label: "Stage 1 — Analysis",  detail: "Identifying AI patterns and unnatural phrasing..." },
  { label: "Stage 2 — Rewrite",   detail: "Reconstructing sentences with natural rhythm..." },
  { label: "Stage 3 — Polish",    detail: "Destroying the AI fingerprint with burstiness & perplexity..." },
];

function PipelineLoader({ isFree }: { isFree: boolean }) {
  const stages = isFree ? FREE_STAGES : PAID_STAGES;
  const [activeStage, setActiveStage] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setActiveStage((prev) => (prev < stages.length - 1 ? prev + 1 : prev));
    }, isFree ? 1200 : 2800);
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isFree, stages.length]);

  return (
    <div className="flex h-full flex-col items-center justify-center gap-8 p-10">
      <div className="relative flex h-20 w-20 items-center justify-center">
        <div className="absolute inset-0 animate-ping rounded-full bg-indigo-100 opacity-60" />
        <div className="relative flex h-16 w-16 items-center justify-center rounded-full bg-indigo-600 shadow-lg shadow-indigo-200">
          <Sparkles className="h-8 w-8 text-white" />
        </div>
      </div>
      <div className="w-full max-w-xs space-y-3">
        {stages.map((stage, i) => {
          const isDone   = i < activeStage;
          const isActive = i === activeStage;
          return (
            <div
              key={stage.label}
              className={`flex items-start gap-3 rounded-xl border p-3 transition-all duration-500 ${
                isActive ? "border-indigo-200 bg-indigo-50 shadow-sm"
                : isDone  ? "border-emerald-100 bg-emerald-50"
                : "border-slate-100 bg-slate-50 opacity-40"
              }`}
            >
              <div className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                isDone   ? "bg-emerald-500 text-white"
                : isActive ? "bg-indigo-600 text-white"
                : "bg-slate-200 text-slate-400"
              }`}>
                {isDone ? <Check size={11} /> : i + 1}
              </div>
              <div>
                <p className={`text-xs font-bold ${isActive ? "text-indigo-700" : isDone ? "text-emerald-700" : "text-slate-400"}`}>
                  {stage.label}
                </p>
                {isActive && (
                  <p className="mt-0.5 animate-pulse text-[11px] text-indigo-500">{stage.detail}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>
      <p className="text-xs text-slate-400">
        {isFree ? "This may take a few seconds..." : "Pro pipeline — this may take 15–30 seconds..."}
      </p>
    </div>
  );
}

export function HumanizerPageClient() {
  const searchParams = useSearchParams();
  const initialText = searchParams.get("text");
  const initialDocumentId = searchParams.get("documentId");
  const fromHistory = searchParams.get("fromHistory") === "1";
  const fromHome = searchParams.get("fromHome") === "1";
  const fromExternal = fromHistory || fromHome;

  const resolveInitialText = () => {
    if (fromExternal) {
      try {
        const stored = sessionStorage.getItem("humanize_prefill_text");
        if (stored) { sessionStorage.removeItem("humanize_prefill_text"); return stored; }
      } catch { /* ignore */ }
    }
    return initialText ? decodeURIComponent(initialText) : "";
  };

  const resolveInitialDocId = () => {
    if (fromHistory) {
      try {
        const stored = sessionStorage.getItem("humanize_prefill_docId");
        if (stored) { sessionStorage.removeItem("humanize_prefill_docId"); return stored; }
      } catch { /* ignore */ }
    }
    return initialDocumentId;
  };

  const [text, setText] = useState(() => resolveInitialText());
  const [tone, setTone] = useState<Tone>("casual");
  const [documentId] = useState<string | null>(() => resolveInitialDocId());
  const [copied, setCopied] = useState(false);

  const { mutate, data, isPending, error } = useHumanizer();
  const { data: profile } = useProfile();

  const isFree = !profile?.subscription_tier || profile.subscription_tier === "free";
  const isToneLocked = (t: ToneOption) => isFree && t.proOnly;

  const handleCopy = async () => {
    if (data?.humanizedText) {
      await navigator.clipboard.writeText(data.humanizedText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleHumanize = () => mutate({ text, tone, documentId });

  const wordCount = text.trim() === "" ? 0 : text.trim().split(/\s+/).length;

  // Panel height matches input area (textarea + action bar)
  const PANEL_HEIGHT = "h-[calc(420px+56px)]";

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:p-6">
      {/* Header */}
      <header className="mb-6 flex items-end justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
            AI Humanizer <Sparkles className="text-indigo-500" size={22} />
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Transform robotic AI text into natural phrasing.{" "}
            {isFree
              ? "Free plan uses a single-stage rewrite."
              : "Your plan uses a 3-stage pipeline for deeper humanization."}
          </p>
        </div>
        {documentId && (
          <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5">
            <FileText size={14} className="text-amber-600" />
            <span className="text-[10px] font-bold uppercase tracking-tight text-amber-700">
              Updating Existing Scan
            </span>
          </div>
        )}
      </header>

      {/* Tone selector */}
      <div className="mb-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center justify-between">
          <span className="text-sm font-semibold text-slate-700">Select Tone</span>
          {isFree && (
            <a
              href="/pricing"
              className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-700 transition hover:bg-amber-100"
            >
              <Lock size={10} /> Upgrade to unlock all tones
            </a>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {TONES.map((t) => {
            const isLocked = isToneLocked(t);
            const isActive = tone === t.value;
            return (
              <button
                key={t.value}
                onClick={() => !isLocked && setTone(t.value)}
                disabled={isLocked}
                title={isLocked ? "Upgrade to unlock this tone" : undefined}
                className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-medium transition-all ${
                  isActive
                    ? "bg-slate-900 text-white shadow-md hover:cursor-pointer"
                    : isLocked
                      ? "cursor-not-allowed bg-slate-100 text-slate-400"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:cursor-pointer"
                }`}
              >
                {isLocked && <Lock size={11} className="shrink-0" />}
                {t.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        {/* ── Input ── */}
        <div className="flex flex-col space-y-4">
          <TextUploadField
            value={text}
            onChange={setText}
            placeholder="Paste or drop your text here..."
            minHeightClassName="min-h-[420px]"
          />
          <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-4 py-3">
            <span className="text-xs font-semibold uppercase tracking-widest text-slate-400">
              {wordCount} {wordCount === 1 ? "word" : "words"}
            </span>
            <button
              onClick={handleHumanize}
              disabled={isPending || wordCount < 50}
              className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-indigo-100 transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isPending ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
              ) : (
                <Sparkles size={16} />
              )}
              {isPending ? "Humanizing..." : documentId ? "Update & Humanize" : "Humanize Text"}
            </button>
          </div>
          {error && (
            <div className="overflow-hidden rounded-2xl border border-red-200 bg-white shadow-sm">
              <div className="h-1 w-full bg-gradient-to-r from-red-500 to-rose-500" />
              <div className="p-5">
                <div className="flex items-start gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-red-100">
                    <AlertCircle size={18} className="text-red-600" />
                  </div>
                  <div className="flex-1">
                    <p className="font-bold text-slate-900">Humanization failed</p>
                    <p className="mt-1 text-sm leading-6 text-slate-600">
                      {error.message}
                    </p>
                    <button
                      onClick={handleHumanize}
                      disabled={isPending || wordCount < 50}
                      className="mt-3 inline-flex cursor-pointer items-center gap-1.5 rounded-lg bg-red-600 px-3.5 py-1.5 text-xs font-bold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Sparkles size={12} /> Try again
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ── Output — fixed height, internal scroll ── */}
        <div className="flex flex-col space-y-4">
          <div className={`flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm ${PANEL_HEIGHT}`}>

            {/* Empty state */}
            {!data && !isPending && (
              <div className="flex h-full flex-col items-center justify-center gap-4 p-10 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-50 shadow-inner">
                  <Sparkles className="h-8 w-8 text-slate-200" />
                </div>
                <div>
                  <p className="font-semibold text-slate-700">Ready to humanize</p>
                  <p className="mt-1 text-sm text-slate-400">Paste at least 50 words and click Humanize Text.</p>
                </div>
              </div>
            )}

            {/* Loading */}
            {isPending && <PipelineLoader isFree={isFree} />}

            {/* Result */}
            {data && !isPending && (
              <div className="flex h-full min-h-0 flex-col">
                {/* Result header */}
                <div className={`shrink-0 border-b border-slate-100 px-4 py-3 ${data.fallback ? "bg-gradient-to-r from-amber-50 to-yellow-50" : "bg-gradient-to-r from-emerald-50 to-teal-50"}`}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      {data.fallback ? (
                        <>
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-amber-400 shadow-sm shadow-amber-200">
                            <AlertCircle size={13} className="text-white" />
                          </div>
                          <span className="text-sm font-bold text-amber-800">Backup Humanizer Used</span>
                        </>
                      ) : (
                        <>
                          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500 shadow-sm shadow-emerald-200">
                            <Sparkles size={13} className="text-white" />
                          </div>
                          <span className="text-sm font-bold text-emerald-800">Humanized Output</span>
                        </>
                      )}
                    </div>
                    <div className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold ${data.fallback ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"}`}>
                      <Zap size={10} className="fill-current" />
                      {data.fallback ? "Local fallback" : isFree ? "1-pass" : "3-pass Pro"}
                    </div>
                  </div>
                  {data.fallback && (
                    <p className="mt-2 text-xs leading-5 text-amber-700">
                      The AI service was temporarily unavailable. A basic rewrite was applied — transitions simplified and contractions added. For full humanization, try again in a moment.
                    </p>
                  )}
                </div>

                {/* Scrollable content */}
                <div className="min-h-0 flex-1 overflow-y-auto p-4">
                  {/* Humanized text — eye-catching */}
                  <div className="rounded-xl border border-emerald-100 bg-gradient-to-br from-white to-emerald-50/30 p-4 text-sm leading-7 text-slate-800 shadow-sm ring-1 ring-emerald-100">
                    {data.humanizedText}
                  </div>

                  {/* Improvements — eye-catching cards */}
                  {data.changes && data.changes.length > 0 && (
                    <div className="mt-4">
                      <div className="mb-2.5 flex items-center gap-2">
                        <div className="h-px flex-1 bg-gradient-to-r from-emerald-200 to-transparent" />
                        <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600">
                          {data.changes.length} Improvements Made
                        </p>
                        <div className="h-px flex-1 bg-gradient-to-l from-emerald-200 to-transparent" />
                      </div>
                      <ul className="space-y-1.5">
                        {data.changes.map((change, i) => (
                          <li
                            key={`${change}-${i}`}
                            className="flex items-start gap-2.5 rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-2 text-xs text-emerald-800"
                          >
                            <div className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-emerald-500">
                              <Check size={9} className="text-white" />
                            </div>
                            {change}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                {/* Copy button — pinned to bottom */}
                <div className="shrink-0 border-t border-slate-100 bg-white p-3">
                  <button
                    onClick={handleCopy}
                    className={`flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold transition-all ${
                      copied
                        ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border border-slate-200 bg-white text-slate-700 shadow-sm hover:bg-slate-50"
                    }`}
                  >
                    {copied ? <><Check size={16} /> Copied!</> : <><Copy size={16} /> Copy Result</>}
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Copy button when no result yet */}
          {(!data || isPending) && (
            <button
              disabled
              className="flex w-full cursor-not-allowed items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-400 opacity-50"
            >
              <Copy size={16} /> Copy Result
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
