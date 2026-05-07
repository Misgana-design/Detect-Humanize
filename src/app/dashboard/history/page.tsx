"use client";

import { useEffect, useState } from "react";
import { jsPDF } from "jspdf";
import { formatDistanceToNow } from "date-fns";
import { useRouter, useSearchParams } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  BarChart3,
  Check,
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

type HistoryDocument = {
  id: string;
  title: string | null;
  original_content: string;
  humanized_content: string | null;
  tone_used: string | null;
  created_at: string;
};

type ToneCounts = Record<string, number>;

// ── Comparison panel ──────────────────────────────────────────────────────────

function ComparisonPanel({
  doc,
  isPaidUser,
  isFree,
  onReHumanize,
}: {
  doc: HistoryDocument;
  isPaidUser: boolean | null | undefined;
  isFree: boolean;
  onReHumanize: (doc: HistoryDocument) => void;
}) {
  const [copiedPlain, setCopiedPlain] = useState(false);
  const [copiedDocs, setCopiedDocs] = useState(false);

  const handleCopyPlain = async () => {
    if (!doc.humanized_content) return;
    await navigator.clipboard.writeText(doc.humanized_content);
    setCopiedPlain(true);
    setTimeout(() => setCopiedPlain(false), 2000);
  };

  const handleCopyForDocs = () => {
    if (!doc.humanized_content) return;
    const blob = new Blob(
      [`<div style="font-family: Arial; line-height: 1.6;">${doc.humanized_content.replace(/\n/g, "<br>")}</div>`],
      { type: "text/html" },
    );
    navigator.clipboard.write([new ClipboardItem({ "text/html": blob })]).then(() => {
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
      `Tone: ${doc.tone_used ?? "default"} | Date: ${new Date(doc.created_at).toLocaleDateString()}`,
      20, 32,
    );
    pdf.line(20, 37, 190, 37);
    const lines = pdf.splitTextToSize(doc.humanized_content ?? "", 170);
    pdf.setFontSize(11);
    pdf.text(lines, 20, 47);
    pdf.save(`humanized-${doc.id.slice(0, 8)}.pdf`);
  };

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* ── Panel header ── */}
      <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-5 py-3">
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold uppercase tracking-widest text-slate-500">
            Comparison Mode
          </span>
          {doc.tone_used && (
            <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold capitalize text-indigo-700">
              {doc.tone_used}
            </span>
          )}
        </div>
        <span className="text-xs text-slate-400">
          {new Date(doc.created_at).toLocaleDateString(undefined, {
            year: "numeric", month: "short", day: "numeric",
          })}
        </span>
      </div>

      {/* ── Action bar — always visible at top ── */}
      {doc.humanized_content ? (
        <div className="border-b border-slate-100 bg-white px-5 py-3">
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {/* Copy plain — always available */}
            <button
              onClick={handleCopyPlain}
              className="flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
            >
              {copiedPlain ? (
                <><Check size={12} className="text-emerald-500" /> Copied!</>
              ) : (
                <><Copy size={12} /> Copy Text</>
              )}
            </button>

            {/* Re-Humanize — paid only */}
            <button
              onClick={() => isPaidUser && onReHumanize(doc)}
              disabled={!isPaidUser}
              title={!isPaidUser ? "Upgrade to Basic or above" : undefined}
              className={`flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition ${
                !isPaidUser
                  ? "cursor-not-allowed border border-slate-200 bg-slate-50 text-slate-400"
                  : "bg-slate-900 text-white hover:bg-black"
              }`}
            >
              {!isPaidUser ? (
                <><Lock size={12} /> Re-Humanize</>
              ) : (
                <><Sparkles size={12} /> Re-Humanize</>
              )}
            </button>

            {/* Copy for Docs — paid only */}
            <button
              onClick={() => isPaidUser && handleCopyForDocs()}
              disabled={!isPaidUser}
              title={!isPaidUser ? "Upgrade to Basic or above" : undefined}
              className={`flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition ${
                !isPaidUser
                  ? "cursor-not-allowed border border-slate-200 bg-slate-50 text-slate-400"
                  : copiedDocs
                    ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                    : "bg-indigo-600 text-white hover:bg-indigo-700"
              }`}
            >
              {!isPaidUser ? (
                <><Lock size={12} /> Docs</>
              ) : copiedDocs ? (
                <><Check size={12} /> Copied!</>
              ) : (
                <><FileText size={12} /> Copy for Docs</>
              )}
            </button>

            {/* Download PDF — paid only */}
            <button
              onClick={() => isPaidUser && handleDownloadPdf()}
              disabled={!isPaidUser}
              title={!isPaidUser ? "Upgrade to Basic or above" : undefined}
              className={`flex items-center justify-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold transition ${
                !isPaidUser
                  ? "cursor-not-allowed border border-slate-200 bg-slate-50 text-slate-400"
                  : "border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
              }`}
            >
              {!isPaidUser ? (
                <><Lock size={12} /> PDF</>
              ) : (
                <><Download size={12} /> Download PDF</>
              )}
            </button>
          </div>

          {!isPaidUser && (
            <p className="mt-2 text-center text-[11px] text-slate-400">
              <a href="/pricing" className="font-semibold text-indigo-600 hover:underline">
                Upgrade to Basic or above
              </a>{" "}
              to unlock Re-Humanize, Copy for Docs, and PDF export.
            </p>
          )}
        </div>
      ) : (
        /* Not humanized yet — action bar at top */
        <div className="border-b border-slate-100 bg-amber-50 px-5 py-3">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Sparkles size={14} className="text-amber-600" />
              <p className="text-xs font-semibold text-amber-800">
                Detection only — not yet humanized
              </p>
            </div>
            {isFree ? (
              <a
                href="/pricing"
                className="inline-flex items-center gap-1.5 rounded-xl border border-amber-200 bg-white px-3 py-1.5 text-xs font-bold text-amber-700 transition hover:bg-amber-50"
              >
                <Lock size={11} />
                Upgrade to Humanize
              </a>
            ) : (
              <button
                onClick={() => onReHumanize(doc)}
                className="inline-flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-1.5 text-xs font-bold text-white shadow-sm shadow-indigo-100 transition hover:bg-indigo-700"
              >
                <Sparkles size={11} />
                Humanize this text
              </button>
            )}
          </div>
        </div>
      )}

      {/* ── Side-by-side text — scrollable ── */}
      <div className="grid min-h-0 flex-1 divide-y divide-slate-100 md:grid-cols-2 md:divide-x md:divide-y-0">
        {/* Original */}
        <div className="flex min-h-0 flex-col p-4">
          <h4 className="mb-2 shrink-0 text-[10px] font-black uppercase tracking-widest text-rose-500">
            Original AI Text
          </h4>
          <div className="flex-1 overflow-y-auto rounded-xl border border-slate-100 bg-slate-50 p-4 text-sm leading-relaxed text-slate-600">
            {doc.original_content}
          </div>
        </div>

        {/* Humanized */}
        <div className="flex min-h-0 flex-col p-4">
          <h4 className="mb-2 flex shrink-0 items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-indigo-600">
            <Sparkles size={10} /> Humanized Version
          </h4>

          {doc.humanized_content ? (
            <div className="flex-1 overflow-y-auto rounded-xl border border-slate-100 bg-white p-4 text-sm leading-relaxed text-slate-800 shadow-inner">
              {doc.humanized_content}
            </div>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 p-8 text-center">
              <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-indigo-50 text-indigo-400">
                <Sparkles size={20} />
              </div>
              <p className="text-sm font-semibold text-slate-700">No humanized version yet</p>
              <p className="mt-1 text-xs text-slate-400">
                Use the button above to humanize this text.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function HistoryPage() {
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();
  const { data: profile } = useProfile();

  const isFree = !profile?.subscription_tier || profile.subscription_tier === "free";
  const isPaidUser = profile?.subscription_tier && profile.subscription_tier !== "free";

  const [isConfirming, setIsConfirming] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  const selectedId = searchParams.get("doc");

  const { data: documents = [], isLoading } = useQuery<HistoryDocument[]>({
    queryKey: ["user-history"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documents")
        .select("id, title, original_content, humanized_content, tone_used, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as HistoryDocument[];
    },
  });

  const selectedDoc = documents.find((d) => d.id === selectedId) ?? null;

  useEffect(() => {
    if (!isLoading && documents.length > 0 && !selectedId) {
      const params = new URLSearchParams(searchParams.toString());
      params.set("doc", documents[0].id);
      router.replace(`/dashboard/history?${params.toString()}`);
    }
  }, [isLoading, documents, selectedId, router, searchParams]);

  const selectDoc = (id: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set("doc", id);
    router.push(`/dashboard/history?${params.toString()}`);
  };

  const { mutate: clearHistory, isPending: isClearing } = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
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
    onSuccess: (_, docId) => {
      queryClient.invalidateQueries({ queryKey: ["user-history"] });
      if (selectedId === docId) router.replace("/dashboard/history");
    },
  });

  // Use sessionStorage to pass long texts — avoids URL length limits
  const handleReHumanize = (doc: HistoryDocument) => {
    try {
      sessionStorage.setItem("humanize_prefill_text", doc.original_content);
      sessionStorage.setItem("humanize_prefill_docId", doc.id);
    } catch {
      // sessionStorage unavailable — fall back to URL (truncated if needed)
    }
    const params = new URLSearchParams();
    // Only put short texts in the URL; long texts come from sessionStorage
    if (doc.original_content.length < 1500) {
      params.set("text", doc.original_content);
    }
    params.set("documentId", doc.id);
    params.set("fromHistory", "1");
    router.push(`/humanize?${params.toString()}`);
  };

  const filteredDocuments = documents.filter((doc) => {
    const q = searchTerm.toLowerCase();
    return (
      doc.title?.toLowerCase().includes(q) ||
      doc.original_content.toLowerCase().includes(q)
    );
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
    <div className="mx-auto max-w-6xl space-y-6 p-6 text-slate-900">
      {/* Header */}
      <header>
        <h1 className="text-2xl font-bold">Document History</h1>
        <p className="text-slate-500">Review and compare your past humanized scans.</p>
        <div className="relative mt-4 w-full md:w-64">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
          <input
            type="text"
            placeholder="Search documents..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-10 pr-4 text-sm outline-none transition focus:ring-2 focus:ring-indigo-400"
          />
        </div>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          { label: "Total Scans", value: totalScans,  icon: <FileText size={16} />, color: "text-blue-600",   bg: "bg-blue-50"   },
          { label: "Active Tones",value: uniqueTones,  icon: <Zap size={16} />,      color: "text-purple-600", bg: "bg-purple-50" },
          { label: "Top Style",   value: topTone,      icon: <BarChart3 size={16} />,color: "text-green-600",  bg: "bg-green-50"  },
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
          <div key={stat.label} className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
            <div className="mb-2 flex items-center gap-3">
              <div className={`rounded-lg p-2 ${stat.bg} ${stat.color}`}>{stat.icon}</div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{stat.label}</span>
            </div>
            <p className="truncate text-xl font-bold capitalize text-slate-900">{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Main grid — fixed height so comparison panel doesn't push buttons off screen */}
      <div className="grid gap-6 lg:grid-cols-[280px_1fr]" style={{ minHeight: "600px" }}>
        {/* Document list */}
        <aside className="flex flex-col gap-2">
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
            <>
              {visibleDocuments.map((doc) => (
                <div key={doc.id} className="group relative">
                  <button
                    onClick={() => selectDoc(doc.id)}
                    className={`w-full rounded-xl border p-4 pr-10 text-left transition-all ${
                      selectedId === doc.id
                        ? "border-indigo-300 bg-indigo-50 shadow-sm ring-1 ring-indigo-300"
                        : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
                    }`}
                  >
                    <p className="truncate text-sm font-semibold text-slate-900">
                      {doc.title || "Untitled Scan"}
                    </p>
                    <div className="mt-1.5 flex items-center justify-between gap-2 text-[11px] text-slate-400">
                      <span className="capitalize">{doc.tone_used || "default"}</span>
                      <span>{formatDistanceToNow(new Date(doc.created_at))} ago</span>
                    </div>
                    {doc.humanized_content && (
                      <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                        <Sparkles size={9} /> Humanized
                      </span>
                    )}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      if (confirm("Delete this scan?")) deleteDocument(doc.id);
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg p-1.5 text-slate-300 opacity-0 transition group-hover:opacity-100 hover:bg-red-50 hover:text-red-500"
                    aria-label="Delete document"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}

              {isFree && documents.length > FREE_DOC_LIMIT && (
                <a
                  href="/pricing"
                  className="flex flex-col items-center gap-1.5 rounded-xl border border-dashed border-indigo-200 bg-indigo-50 px-4 py-4 text-center transition hover:bg-indigo-100"
                >
                  <Lock size={14} className="text-indigo-400" />
                  <p className="text-xs font-bold text-indigo-700">
                    {documents.length - FREE_DOC_LIMIT} more document{documents.length - FREE_DOC_LIMIT !== 1 ? "s" : ""} hidden
                  </p>
                  <p className="text-[11px] text-indigo-500">Upgrade to see full history</p>
                </a>
              )}
              {isFree && documents.length <= FREE_DOC_LIMIT && documents.length > 0 && (
                <a
                  href="/pricing"
                  className="flex items-center justify-center gap-1.5 rounded-xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-center transition hover:bg-slate-100"
                >
                  <Lock size={12} className="text-slate-400" />
                  <p className="text-xs text-slate-500">Free plan: last 3 docs only. <span className="font-semibold text-indigo-600">Upgrade</span></p>
                </a>
              )}
            </>
          )}

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
        </aside>

        {/* Comparison panel */}
        <main className="min-h-0">
          {selectedDoc ? (
            <ComparisonPanel
              doc={selectedDoc}
              isPaidUser={isPaidUser}
              isFree={isFree}
              onReHumanize={handleReHumanize}
            />
          ) : (
            <div className="flex h-64 items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 text-sm text-slate-400">
              Select a document from the list to view comparison
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
