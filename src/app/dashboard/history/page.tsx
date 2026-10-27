"use client";

import { useEffect, useState } from "react";
import { jsPDF } from "jspdf";
import { formatDistanceToNow } from "date-fns";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  BarChart3,
  Check,
  ChevronDown,
  Clock,
  Copy,
  Download,
  FileText,
  Lock,
  Search,
  Sparkles,
  Trash2,
  Zap,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useProfile } from "@/hooks/userProfile";
import { exportHtmlDoc, exportMarkdown, exportPlainText } from "@/lib/clientExports";
import { getLanguageLabel } from "@/lib/languages";

type HistoryDocument = {
  id: string;
  title: string | null;
  original_content: string;
  humanized_content: string | null;
  tone_used: string | null;
  language?: string | null;
  created_at: string;
};

type ToneCounts = Record<string, number>;

const countWords = (text: string | null | undefined) =>
  text && text.trim() ? text.trim().split(/\s+/).length : 0;

// ── History card ─────────────────────────────────────────────────────────────

function HistoryCard({
  doc,
  isPaidUser,
  isFree,
  onReHumanize,
  onDelete,
  defaultExpanded = false,
}: {
  doc: HistoryDocument;
  isPaidUser: boolean | null | undefined;
  isFree: boolean;
  onReHumanize: (doc: HistoryDocument) => void;
  onDelete: (docId: string) => void;
  defaultExpanded?: boolean;
}) {
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [copiedPlain, setCopiedPlain] = useState(false);
  const [copiedInput, setCopiedInput] = useState(false);
  const [copiedDocs, setCopiedDocs] = useState(false);

  const previewText = doc.humanized_content || doc.original_content;
  const wordCount = countWords(doc.humanized_content) || countWords(doc.original_content);

  const handleCopyPlain = async () => {
    if (!doc.humanized_content) return;
    await navigator.clipboard.writeText(doc.humanized_content);
    setCopiedPlain(true);
    setTimeout(() => setCopiedPlain(false), 2000);
  };

  const handleCopyInput = async () => {
    if (!doc.original_content) return;
    await navigator.clipboard.writeText(doc.original_content);
    setCopiedInput(true);
    setTimeout(() => setCopiedInput(false), 2000);
  };

  const handleCopyForDocs = () => {
    if (!doc.humanized_content) return;
    const blob = new Blob(
      [`<div style="font-family: Arial; line-height: 1.6;">${doc.humanized_content.replace(/\n/g, "<br>")}</div>`],
      { type: "text/html" },
    );
    navigator.clipboard
      .write([new ClipboardItem({ "text/html": blob })])
      .then(() => {
        setCopiedDocs(true);
        setTimeout(() => setCopiedDocs(false), 2000);
      });
  };

  const handleDownloadPdf = () => {
    const pdf = new jsPDF();
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(18);
    pdf.text("Humanized Content", 20, 22);
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(10);
    pdf.text(
      `Tone: ${doc.tone_used ?? "casual"} | Date: ${new Date(doc.created_at).toLocaleDateString()}`,
      20,
      32,
    );
    pdf.line(20, 37, 190, 37);
    const lines = pdf.splitTextToSize(doc.humanized_content ?? "", 170);
    pdf.setFontSize(11);
    pdf.text(lines, 20, 47);
    pdf.save(`humanized-${doc.id.slice(0, 8)}.pdf`);
  };

  const handleExportText = (format: "txt" | "md" | "doc") => {
    if (!doc.humanized_content) return;
    const payload = {
      title: doc.title || "Humanized Content",
      metadata: {
        Tone: doc.tone_used ?? "casual",
        Language: getLanguageLabel(doc.language),
        Date: new Date(doc.created_at).toLocaleDateString(),
      },
      body: doc.humanized_content,
    };
    if (format === "txt") exportPlainText(payload);
    if (format === "md") exportMarkdown(payload);
    if (format === "doc") exportHtmlDoc(payload);
  };

  const toggle = () => setExpanded((prev) => !prev);

  return (
    <div className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* ── Collapsed header (click to expand/collapse) ── */}
      <button
        onClick={toggle}
        aria-expanded={expanded}
        className="w-full px-4 py-4 pr-24 text-left transition hover:bg-slate-50 sm:px-5 sm:pr-24"
      >
        <div className="mb-2 flex flex-wrap items-center gap-2 sm:gap-3">
          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
            {wordCount} words
          </span>
          <span className="text-sm text-slate-500">
            {new Date(doc.created_at).toLocaleString(undefined, {
              month: "short",
              day: "numeric",
              year: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })}
          </span>
          {doc.tone_used && (
            <span className="rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-semibold capitalize text-indigo-700">
              {doc.tone_used}
            </span>
          )}
        </div>
        <p className="line-clamp-2 text-sm leading-relaxed text-slate-600">
          {previewText || "Untitled scan"}
        </p>
      </button>

      {/* Delete — sibling of the toggle button so no nested interactives */}
      <button
        onClick={() => {
          if (confirm("Delete this scan?")) onDelete(doc.id);
        }}
        aria-label="Delete document"
        className="absolute right-12 top-4 z-10 rounded-lg p-1.5 text-slate-300 opacity-100 transition hover:bg-red-50 hover:text-red-500 sm:opacity-0 sm:group-hover:opacity-100"
      >
        <Trash2 size={16} />
      </button>

      {/* "Show more" chevron toggle */}
      <button
        onClick={toggle}
        aria-expanded={expanded}
        aria-label={expanded ? "Show less" : "Show more"}
        title={expanded ? "Show less" : "Show more"}
        className={`absolute right-3 top-4 z-10 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 ${
          expanded ? "rotate-180" : ""
        }`}
      >
        <ChevronDown size={18} />
      </button>

      {/* ── Expanded content ── */}
      {expanded && (
        <div className="border-t border-slate-100">
          {/* Original */}
          <div className="px-4 py-4 sm:px-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h4 className="text-sm font-bold text-slate-900">Original:</h4>
              <button
                onClick={handleCopyInput}
                className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 hover:cursor-pointer"
              >
                {copiedInput ? (
                  <>
                    <Check size={12} className="text-emerald-500" /> Copied!
                  </>
                ) : (
                  <>
                    <Copy size={12} /> Copy Input
                  </>
                )}
              </button>
            </div>
            <div className="max-h-64 overflow-y-auto whitespace-pre-wrap rounded-xl border border-slate-100 bg-slate-50 p-4 text-sm leading-relaxed text-slate-600 sm:max-h-80">
              {doc.original_content}
            </div>
          </div>

          {/* Humanized */}
          <div className="border-t border-slate-100 px-4 py-4 sm:px-5">
            {doc.humanized_content ? (
              <>
                <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
                  <h4 className="flex items-center gap-1.5 text-sm font-bold text-slate-900">
                    <Sparkles size={13} className="text-indigo-500" /> Humanized:
                  </h4>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      onClick={handleCopyPlain}
                      className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 hover:cursor-pointer"
                    >
                      {copiedPlain ? (
                        <>
                          <Check size={12} className="text-emerald-500" /> Copied!
                        </>
                      ) : (
                        <>
                          <Copy size={12} /> Copy Text
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => isPaidUser && handleCopyForDocs()}
                      disabled={!isPaidUser}
                      title={!isPaidUser ? "Upgrade to Basic or above" : undefined}
                      className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition ${
                        !isPaidUser
                          ? "cursor-not-allowed border border-slate-200 bg-slate-50 text-slate-400"
                          : copiedDocs
                            ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                            : "bg-indigo-600 text-white hover:bg-indigo-700 hover:cursor-pointer"
                      }`}
                    >
                      {!isPaidUser ? (
                        <>
                          <Lock size={12} /> Docs
                        </>
                      ) : copiedDocs ? (
                        <>
                          <Check size={12} /> Copied!
                        </>
                      ) : (
                        <>
                          <FileText size={12} /> Copy for Docs
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => isPaidUser && onReHumanize(doc)}
                      disabled={!isPaidUser}
                      title={!isPaidUser ? "Upgrade to Basic or above" : undefined}
                      className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition ${
                        !isPaidUser
                          ? "cursor-not-allowed border border-slate-200 bg-slate-50 text-slate-400"
                          : "bg-slate-900 text-white hover:bg-black hover:cursor-pointer"
                      }`}
                    >
                      {!isPaidUser ? <Lock size={12} /> : <Sparkles size={12} />} Re-Humanize
                    </button>

                    <button
                      onClick={() => isPaidUser && handleDownloadPdf()}
                      disabled={!isPaidUser}
                      title={!isPaidUser ? "Upgrade to Basic or above" : undefined}
                      className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition ${
                        !isPaidUser
                          ? "cursor-not-allowed border border-slate-200 bg-slate-50 text-slate-400"
                          : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:cursor-pointer"
                      }`}
                    >
                      {!isPaidUser ? <Lock size={12} /> : <Download size={12} />} PDF
                    </button>

                    {(["txt", "md", "doc"] as const).map((format) => (
                      <button
                        key={format}
                        onClick={() => isPaidUser && handleExportText(format)}
                        disabled={!isPaidUser}
                        title={!isPaidUser ? "Upgrade to Basic or above" : undefined}
                        className={`flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold uppercase transition ${
                          !isPaidUser
                            ? "cursor-not-allowed border border-slate-200 bg-slate-50 text-slate-400"
                            : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 hover:cursor-pointer"
                        }`}
                      >
                        <Download size={12} /> {format}
                      </button>
                    ))}
                  </div>
                </div>

                {!isPaidUser && (
                  <p className="mb-3 text-[11px] text-slate-400">
                    <a href="/pricing" className="font-semibold text-indigo-600 hover:underline">
                      Upgrade to Basic or above
                    </a>{" "}
                    to unlock Copy for Docs, PDF export, and Re-Humanize.
                  </p>
                )}

                <div className="max-h-64 overflow-y-auto whitespace-pre-wrap rounded-xl border border-slate-100 bg-white p-4 text-sm leading-relaxed text-slate-800 shadow-inner sm:max-h-80">
                  {doc.humanized_content}
                </div>
              </>
            ) : (
              <div className="flex flex-col gap-3 rounded-xl border border-amber-100 bg-amber-50 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles size={14} className="text-amber-600" />
                  <p className="text-xs font-semibold text-amber-800">Not yet humanized</p>
                </div>
                {isFree ? (
                  <a
                    href="/pricing"
                    className="inline-flex items-center gap-1.5 rounded-xl border border-amber-200 bg-white px-3 py-1.5 text-xs font-bold text-amber-700 transition hover:bg-amber-50"
                  >
                    <Lock size={11} /> Upgrade to Humanize
                  </a>
                ) : (
                  <button
                    onClick={() => onReHumanize(doc)}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-1.5 text-xs font-bold text-white shadow-sm shadow-indigo-100 transition hover:bg-indigo-700"
                  >
                    <Sparkles size={11} /> Humanize this text
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function HistoryPage() {
  const supabase = createClient();
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: profile } = useProfile();

  const isFree = !profile?.subscription_tier || profile.subscription_tier === "free";
  const isPaidUser = profile?.subscription_tier && profile.subscription_tier !== "free";

  const [isConfirming, setIsConfirming] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "humanized">("all");
  const [toneFilter, setToneFilter] = useState("all");

  const { data: documents = [], isLoading } = useQuery<HistoryDocument[]>({
    queryKey: ["user-history"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documents")
        .select("id, title, original_content, humanized_content, tone_used, language, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as HistoryDocument[];
    },
  });

  const { mutate: clearHistory, isPending: isClearing } = useMutation({
    mutationFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase.from("documents").delete().eq("user_id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-history"] });
      setIsConfirming(false);
      router.replace("/dashboard/history");
    },
  });

  const { mutate: deleteDocument } = useMutation({
    mutationFn: async (docId: string) => {
      const { error } = await supabase.from("documents").delete().eq("id", docId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-history"] });
    },
  });

  const handleReHumanize = (doc: HistoryDocument) => {
    try {
      sessionStorage.setItem("humanize_prefill_text", doc.original_content);
      sessionStorage.setItem("humanize_prefill_docId", doc.id);
    } catch {
      // sessionStorage unavailable
    }
    const params = new URLSearchParams();
    if (doc.original_content.length < 1500) params.set("text", doc.original_content);
    params.set("documentId", doc.id);
    params.set("fromHistory", "1");
    router.push(`/?${params.toString()}`);
  };

  const filteredDocuments = documents.filter((doc) => {
    const q = searchTerm.toLowerCase();
    const matchesSearch =
      doc.title?.toLowerCase().includes(q) ||
      doc.original_content.toLowerCase().includes(q) ||
      doc.humanized_content?.toLowerCase().includes(q);
    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "humanized" ? Boolean(doc.humanized_content) : !doc.humanized_content);
    const matchesTone = toneFilter === "all" || (doc.tone_used || "casual") === toneFilter;
    return matchesSearch && matchesStatus && matchesTone;
  });

  const FREE_DOC_LIMIT = 3;
  const visibleDocuments = isFree
    ? filteredDocuments.slice(0, FREE_DOC_LIMIT)
    : filteredDocuments;

  const totalScans = documents.length;
  const uniqueTones = new Set(documents.map((d) => d.tone_used).filter(Boolean)).size;
  const toneCounts = documents.reduce<ToneCounts>((acc, doc) => {
    const k = doc.tone_used || "unknown";
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {});
  const topTone = Object.keys(toneCounts).reduce(
    (a, b) => (toneCounts[a] > toneCounts[b] ? a : b),
    "None",
  );

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-5 text-slate-900 sm:space-y-6">
      {/* Header */}
      <header>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold sm:text-2xl">Document History</h1>
            <p className="text-sm text-slate-500">
              Review your past humanized scans.
            </p>
          </div>
          {documents.length > 0 && (
            <div className="pt-1">
              {!isConfirming ? (
                <button
                  onClick={() => setIsConfirming(true)}
                  className="flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium text-red-500 transition hover:bg-red-50"
                >
                  <Trash2 size={13} /> Clear all history
                </button>
              ) : (
                <div className="flex items-center gap-2 rounded-xl border border-red-100 bg-white p-2 shadow">
                  <AlertCircle size={14} className="shrink-0 text-red-500" />
                  <span className="text-xs font-semibold text-red-600">Sure?</span>
                  <button
                    onClick={() => clearHistory()}
                    disabled={isClearing}
                    className="rounded-lg bg-red-600 px-2.5 py-1 text-xs font-bold text-white hover:bg-red-700 disabled:opacity-50"
                  >
                    {isClearing ? "Deleting..." : "Yes"}
                  </button>
                  <button
                    onClick={() => setIsConfirming(false)}
                    className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600 hover:bg-slate-200"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
        <div className="relative mt-4 w-full sm:w-64">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            size={16}
          />
          <input
            type="text"
            placeholder="Search documents..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-10 pr-4 text-sm outline-none transition focus:ring-2 focus:ring-indigo-400"
          />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <select
            value={statusFilter}
            onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 outline-none focus:ring-2 focus:ring-indigo-200"
          >
            <option value="all">All statuses</option>
            <option value="humanized">Humanized</option>
          </select>
          <select
            value={toneFilter}
            onChange={(event) => setToneFilter(event.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 outline-none focus:ring-2 focus:ring-indigo-200"
          >
            <option value="all">All tones</option>
            {Array.from(new Set(documents.map((doc) => doc.tone_used || "casual"))).map((tone) => (
              <option key={tone} value={tone}>
                {tone}
              </option>
            ))}
          </select>
        </div>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-4">
        {[
          { label: "Total Scans",  value: totalScans,  icon: <FileText size={16} />, color: "text-blue-600",   bg: "bg-blue-50"   },
          { label: "Active Tones", value: uniqueTones,  icon: <Zap size={16} />,      color: "text-purple-600", bg: "bg-purple-50" },
          { label: "Top Style",    value: topTone,      icon: <BarChart3 size={16} />,color: "text-green-600",  bg: "bg-green-50"  },
          {
            label: "Last Scan",
            value: documents[0]?.created_at
              ? formatDistanceToNow(new Date(documents[0].created_at))
              : "N/A",
            icon: <Clock size={16} />,
            color: "text-orange-600",
            bg: "bg-orange-50",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl border border-slate-100 bg-white p-3 shadow-sm sm:p-4"
          >
            <div className="mb-2 flex items-center gap-2 sm:gap-3">
              <div className={`rounded-lg p-1.5 sm:p-2 ${stat.bg} ${stat.color}`}>
                {stat.icon}
              </div>
              <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400 sm:text-[10px]">
                {stat.label}
              </span>
            </div>
            <p className="truncate text-lg font-bold capitalize text-slate-900 sm:text-xl">
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      {/* ── Document list — vertical stack of expandable cards ── */}
      {filteredDocuments.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-12 text-center">
          <Search size={20} className="mb-3 text-slate-300" />
          <p className="text-xs font-bold text-slate-900">No matches found</p>
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="mt-3 text-xs font-semibold text-indigo-600 underline underline-offset-4"
            >
              Clear search
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {visibleDocuments.map((doc, index) => (
            <HistoryCard
              key={doc.id}
              doc={doc}
              isPaidUser={isPaidUser}
              isFree={isFree}
              onReHumanize={handleReHumanize}
              onDelete={deleteDocument}
              defaultExpanded={index === 0}
            />
          ))}

          {isFree && documents.length > FREE_DOC_LIMIT && (
            <a
              href="/pricing"
              className="flex flex-col items-center gap-1.5 rounded-2xl border border-dashed border-indigo-200 bg-indigo-50 px-4 py-4 text-center transition hover:bg-indigo-100"
            >
              <Lock size={14} className="text-indigo-400" />
              <p className="text-xs font-bold text-indigo-700">
                {documents.length - FREE_DOC_LIMIT} more document
                {documents.length - FREE_DOC_LIMIT !== 1 ? "s" : ""} hidden
              </p>
              <p className="text-[11px] text-indigo-500">
                Upgrade to see full history
              </p>
            </a>
          )}
          {isFree && documents.length <= FREE_DOC_LIMIT && documents.length > 0 && (
            <a
              href="/pricing"
              className="flex items-center justify-center gap-1.5 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-center transition hover:bg-slate-100"
            >
              <Lock size={12} className="text-slate-400" />
              <p className="text-xs text-slate-500">
                Free plan: last 3 docs only.{" "}
                <span className="font-semibold text-indigo-600">Upgrade</span>
              </p>
            </a>
          )}
        </div>
      )}
    </div>
  );
}
