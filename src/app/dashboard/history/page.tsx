"use client";

import { jsPDF } from "jspdf";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client"; // Your browser client
import { formatDistanceToNow } from "date-fns";
import { useState } from "react";
import {
  Trash2,
  FileText,
  Zap,
  BarChart3,
  Clock,
  AlertCircle,
  Sparkles,
  Search,
} from "lucide-react";

import { useRouter } from "next/navigation";

export default function HistoryPage() {
  const supabase = createClient();
  const [selectedDoc, setSelectedDoc] = useState<any>(null);
  const queryClient = useQueryClient();
  const [isConfirming, setIsConfirming] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // Fetch documents from Supabase
  const { data: documents, isLoading } = useQuery({
    queryKey: ["user-history"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  // Mutation to clear history
  const { mutate: clearHistory, isPending: isClearing } = useMutation({
    mutationFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const { error } = await supabase
        .from("documents")
        .delete()
        .eq("user_id", user.id);

      if (error) throw error;
    },
    onSuccess: () => {
      // Refresh the list and reset selection
      queryClient.invalidateQueries({ queryKey: ["user-history"] });
      setSelectedDoc(null);
      setIsConfirming(false);
    },
  });

  // 1. Mutation for deleting a single document
  const { mutate: deleteDocument } = useMutation({
    mutationFn: async (docId: string) => {
      const { error } = await supabase
        .from("documents")
        .delete()
        .eq("id", docId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["user-history"] });
      // If the deleted doc was the one currently open, deselect it
      setSelectedDoc(null);
    },
  });

  const copyForGoogleDocs = (content: string) => {
    // We wrap it in a basic HTML structure so Google Docs recognizes the formatting
    const blob = new Blob(
      [
        `<div style="font-family: 'Arial'; line-height: 1.5;">${content.replace(/\n/g, "<br>")}</div>`,
      ],
      { type: "text/html" },
    );

    const data = [new ClipboardItem({ "text/html": blob })];

    navigator.clipboard.write(data).then(() => {
      alert("Copied! Just paste (Ctrl+V) in Google Docs to keep formatting.");
    });
  };

  const handleDownload = (doc: any) => {
    const pdf = new jsPDF();

    // PDF Styling
    pdf.setFont("helvetica", "bold");
    pdf.setFontSize(20);
    pdf.text("Humanized Content", 20, 20);

    pdf.setFontSize(10);
    pdf.setFont("helvetica", "normal");
    pdf.text(
      `Tone: ${doc.tone_used} | Date: ${new Date(doc.created_at).toLocaleDateString()}`,
      20,
      30,
    );

    // Horizontal Line
    pdf.line(20, 35, 190, 35);

    // Content (Handles text wrapping)
    pdf.setFontSize(12);
    const splitText = pdf.splitTextToSize(doc.humanized_content, 170);
    pdf.text(splitText, 20, 45);

    // Save the file
    pdf.save(`humanized-${doc.id.slice(0, 8)}.pdf`);
  };

  const filteredDocuments = documents?.filter(
    (doc: any) =>
      doc.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      doc.original_content?.toLowerCase().includes(searchTerm.toLowerCase()),
  );

  const router = useRouter();

  const handleReHumanize = (doc: any) => {
    // We pass the content back to the main dashboard via URL params
    // or you can use a state management library. URL params are easiest:
    const params = new URLSearchParams();
    params.set("text", doc.original_content);

    router.push(`/dashboard?${params.toString()}`);
  };

  const totalScans = documents?.length || 0;
  const uniqueTones = new Set(documents?.map((d) => d.tone_used)).size;

  // Find the most used tone
  const toneCounts = documents?.reduce((acc: any, doc: any) => {
    acc[doc.tone_used] = (acc[doc.tone_used] || 0) + 1;
    return acc;
  }, {});
  const topTone = Object.keys(toneCounts || {}).reduce(
    (a, b) => (toneCounts[a] > toneCounts[b] ? a : b),
    "None",
  );

  if (isLoading)
    return (
      <div className="p-10 animate-pulse text-gray-400">
        Loading your history...
      </div>
    );

  return (
    <div className="max-w-6xl mx-auto p-6 font-geist text-slate-900">
      <header className="mb-8">
        <h1 className="text-2xl font-bold">Document History</h1>
        <p className="text-slate-500">
          Review and compare your past humanized scans.
        </p>
        {/* Search Bar */}
        <div className="relative w-full md:w-64">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
            size={16}
          />
          <input
            type="text"
            placeholder="Search documents..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-black outline-none transition-all"
          />
        </div>
      </header>

      {/* STATS STRIP */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          {
            label: "Total Scans",
            value: totalScans,
            icon: <FileText size={16} />,
            color: "text-blue-600",
            bg: "bg-blue-50",
          },
          {
            label: "Active Tones",
            value: uniqueTones,
            icon: <Zap size={16} />,
            color: "text-purple-600",
            bg: "bg-purple-50",
          },
          {
            label: "Top Style",
            value: topTone,
            icon: <BarChart3 size={16} />,
            color: "text-green-600",
            bg: "bg-green-50",
          },
          {
            label: "Last Scan",
            value: formatDistanceToNow(new Date(documents?.[0]?.created_at)),
            icon: <Clock size={16} />,
            color: "text-orange-600",
            bg: "bg-orange-50",
          },
        ].map((stat, i) => (
          <div
            key={i}
            className="p-4 bg-white border border-slate-100 rounded-2xl shadow-sm"
          >
            <div className="flex items-center gap-3 mb-2">
              <div className={`p-2 rounded-lg ${stat.bg} ${stat.color}`}>
                {stat.icon}
              </div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                {stat.label}
              </span>
            </div>
            <p className="text-xl font-bold text-slate-900 truncate capitalize">
              {stat.value}
            </p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Sidebar: List of past scans */}
        <div className="lg:col-span-1 space-y-3">
          {filteredDocuments?.length === 0 ? (
            /* THE EMPTY SEARCH STATE */
            <div className="flex flex-col items-center justify-center py-12 px-4 text-center bg-slate-50/50 border border-dashed border-slate-200 rounded-2xl">
              <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm mb-3">
                <Search size={18} className="text-slate-300" />
              </div>
              <p className="text-xs font-bold font-mono text-slate-900">
                No matches found
              </p>
              <p className="text-[10px] text-slate-500 mt-1 leading-relaxed font-mono">
                We couldn't find anything matching
                <span className="text-black font-semibold">"{searchTerm}"</span>
                .
              </p>
              <button
                onClick={() => setSearchTerm("")}
                className="mt-4 text-[10px] font-bold font-mono text-black underline underline-offset-4 hover:text-slate-600"
              >
                Clear search
              </button>
            </div>
          ) : (
            filteredDocuments?.map((doc: any) => (
              <>
                <div key={doc.id} className="group relative">
                  {/* Group for hover effects */}
                  <button
                    onClick={() =>
                      setSelectedDoc((prev: any) => (prev === doc ? null : doc))
                    }
                    className={`w-full text-left p-4 rounded-xl border transition-all pr-12 hover:cursor-pointer ${
                      selectedDoc?.id === doc.id
                        ? "bg-white border-black shadow-md ring-1 ring-black"
                        : "bg-slate-50 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    <h3 className="font-semibold truncate text-sm">
                      {doc.title}
                    </h3>
                    <div className="flex justify-between mt-2 text-[11px] uppercase tracking-wider font-bold text-slate-400 gap-1.5">
                      <span>{doc.tone_used}</span>
                      <span>
                        {formatDistanceToNow(new Date(doc.created_at))} ago
                      </span>
                    </div>
                  </button>
                  {/* INDIVIDUAL DELETE BUTTON */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation(); // Prevents the doc from being selected when clicking delete
                      if (confirm("Delete this scan?")) deleteDocument(doc.id);
                    }}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </>
            ))
          )}
        </div>

        {/* Main View: Comparison Engine */}
        <div className="lg:col-span-2">
          {selectedDoc ? (
            <>
              <div className="bg-white border rounded-2xl overflow-hidden shadow-sm">
                <div className="p-4 border-b bg-slate-50 flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-500 uppercase">
                    Comparison Mode
                  </span>
                  <button
                    onClick={() =>
                      navigator.clipboard.writeText(
                        selectedDoc.humanized_content,
                      )
                    }
                    className="text-xs bg-black text-white px-3 py-1 rounded-md hover:bg-slate-800 transition-colors"
                  >
                    Copy Humanized
                  </button>
                </div>

                <div className="grid md:grid-cols-2 divide-x">
                  {/* Original */}
                  <div className="p-6">
                    <h4 className="text-[10px] font-black text-red-500 uppercase mb-4 tracking-widest">
                      Original AI Text
                    </h4>
                    <p className="text-sm text-slate-600 leading-relaxed italic line-through decoration-red-200">
                      {selectedDoc.original_content}
                    </p>
                  </div>

                  {/* Humanized */}
                  <div className="p-6 bg-green-50/30">
                    <h4 className="text-[10px] font-black text-green-600 uppercase mb-4 tracking-widest">
                      Humanized Version
                    </h4>
                    <p className="text-sm text-slate-800 leading-relaxed font-medium">
                      {selectedDoc.humanized_content}
                    </p>
                    <button
                      onClick={() =>
                        copyForGoogleDocs(selectedDoc.humanized_content)
                      }
                      className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
                    >
                      <FileText size={16} />
                      Copy for Google Docs
                    </button>
                    <button
                      onClick={() => handleDownload(selectedDoc)}
                      className="text-xs bg-white border border-slate-200 text-slate-700 px-3 py-1 rounded-md hover:bg-slate-50 transition-colors flex items-center gap-2"
                    >
                      <span>Download PDF</span>
                    </button>
                    <button
                      onClick={() => handleReHumanize(selectedDoc)}
                      className="flex-1 text-xs bg-slate-900 text-white py-2 rounded-lg hover:bg-black transition-colors flex items-center justify-center gap-2"
                    >
                      <Sparkles size={14} />
                      Re-Humanize
                    </button>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="h-100 border-2 border-dashed border-slate-200 rounded-2xl flex items-center justify-center text-slate-400">
              Select a document to view comparison
            </div>
          )}
        </div>

        {documents?.length !== 0 && (
          <div className="relative">
            {!isConfirming ? (
              <button
                onClick={() => setIsConfirming(true)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 hover:bg-red-50 hover:cursor-pointer rounded-lg transition-colors"
              >
                <Trash2 size={16} />
                Clear History
              </button>
            ) : (
              <div className="flex items-center gap-2 bg-white border border-red-100 p-1 rounded-lg shadow-lg animate-in fade-in zoom-in duration-200">
                <span className="text-[11px] font-mono font-bold px-2 text-red-600 flex items-center gap-1">
                  <AlertCircle size={20} />{" "}
                  <span className="ml-2">Are you sure?</span>
                </span>
                <button
                  onClick={() => clearHistory()}
                  disabled={isClearing}
                  className="px-3 py-1 bg-red-600 text-white text-xs font-bold rounded hover:bg-red-700 hover:cursor-pointer disabled:opacity-50 font-mono"
                >
                  {isClearing ? "Deleting..." : "Yes, Delete All"}
                </button>
                <button
                  onClick={() => setIsConfirming(false)}
                  className="px-3 py-1 bg-slate-100 text-slate-600 text-xs font-bold rounded hover:bg-slate-200 font-mono hover:cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
