"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useDetection } from "@/hooks/useDetection";
import {
  Zap,
  Sparkles,
  Loader2,
  Clipboard,
  ChevronRight,
  AlertCircle,
} from "lucide-react";

export default function DetectPage() {
  const router = useRouter();
  const [text, setText] = useState("");
  const { mutate, data, isPending, error } = useDetection();

  const handleScan = () => {
    mutate(text);
  };

  // 1. HIGHLIGHTER LOGIC
  // Splits text into sentences and checks if they appear in the flaggedSentences array
  const renderHighlightedText = (content: string, flagged: string[]) => {
    if (!flagged || flagged.length === 0) return content;

    // Splits by punctuation but keeps the delimiters in the array
    const segments = content.split(/([.!?]+[\s\n]+)/);

    return segments.map((segment, i) => {
      const isFlagged = flagged.some(
        (f) => f.includes(segment.trim()) && segment.trim().length > 10,
      );

      return (
        <span
          key={i}
          className={
            isFlagged
              ? "bg-red-100 text-red-900 border-b-2 border-red-200 transition-colors"
              : ""
          }
        >
          {segment}
        </span>
      );
    });
  };

  // 2. REDIRECT LOGIC
  // Sends text and documentId to the humanizer page
  const handleRedirectToHumanizer = () => {
    if (!data?.documentId) return;

    const params = new URLSearchParams({
      text: text,
      documentId: data.documentId,
    });

    router.push(`/humanize?${params.toString()}`);
  };

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      <header>
        <h1 className="text-3xl font-bold text-gray-900">
          AI Content Detector
        </h1>
        <p className="text-gray-500 mt-2">
          Identify AI-generated patterns and flagged sentences.
        </p>
      </header>

      <div className="grid md:grid-cols-2 gap-8 items-start">
        {/* Left: Input */}
        <div className="space-y-4">
          <div className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm focus-within:ring-2 focus-within:ring-indigo-500 transition-all">
            <textarea
              className="w-full h-96 outline-none text-slate-800 resize-none text-base leading-relaxed"
              placeholder="Paste your text here (min 50 words)..."
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <div className="flex justify-between items-center mt-4 pt-4 border-t border-gray-50">
              <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">
                Word Count:
                {text.trim() === "" ? 0 : text.trim().split(/\s+/).length}
              </span>
              <button
                onClick={handleScan}
                disabled={isPending || text.split(/\s+/).length < 50}
                className="px-6 py-2.5 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 disabled:opacity-50 transition-all flex items-center gap-2 shadow-lg shadow-indigo-100"
              >
                {isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Zap className="w-4 h-4" />
                )}
                Analyze Content
              </button>
            </div>
          </div>
          {error && (
            <div className="flex items-center gap-2 text-red-500 text-sm bg-red-50 p-3 rounded-lg border border-red-100">
              <AlertCircle size={16} />
              {error.message}
            </div>
          )}
        </div>

        {/* Right: Analysis Results */}
        <div className="bg-slate-50 border border-gray-200 rounded-2xl p-0 overflow-hidden h-135 flex flex-col shadow-sm">
          {!data && !isPending ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-10">
              <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-sm mb-4">
                <Zap className="text-gray-200" size={32} />
              </div>
              <p className="text-gray-400 text-sm font-medium">
                Results will appear here after analysis.
              </p>
            </div>
          ) : isPending ? (
            <div className="flex-1 flex flex-col items-center justify-center space-y-4">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
              <p className="text-indigo-600 text-sm font-bold animate-pulse">
                Scanning for AI patterns...
              </p>
            </div>
          ) : (
            <div className="flex flex-col h-full">
              {/* Score Header */}
              <div className="bg-white p-6 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <h2 className="text-xs font-black text-gray-400 uppercase tracking-widest">
                    Probability Score
                  </h2>
                  <div
                    className={`text-4xl font-black mt-1 ${data.aiProbability > 50 ? "text-red-500" : "text-emerald-500"}`}
                  >
                    {Math.round(data.aiProbability)}%
                  </div>
                </div>
                <div className="text-right">
                  <span
                    className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-tighter ${
                      data.aiProbability > 50
                        ? "bg-red-50 text-red-600 border border-red-100"
                        : "bg-emerald-50 text-emerald-600 border border-emerald-100"
                    }`}
                  >
                    {data.aiProbability > 50 ? "Likely AI" : "Likely Human"}
                  </span>
                </div>
              </div>

              {/* Highlighted Text Area */}
              <div className="flex-1 overflow-y-auto p-6">
                <h3 className="text-[10px] font-black text-gray-400 uppercase mb-4 tracking-widest">
                  Detailed Analysis
                </h3>
                <div className="bg-white p-5 rounded-xl border border-gray-100 leading-relaxed text-slate-800 text-sm shadow-inner min-h-50">
                  {renderHighlightedText(text, data.flaggedSentences || [])}
                </div>

                {data.analysis && (
                  <p className="mt-4 text-xs text-slate-500 italic leading-relaxed">
                    <strong>Note:</strong> {data.analysis}
                  </p>
                )}
              </div>

              {/* Action Footer */}
              <div className="p-4 bg-white border-t border-gray-100">
                <button
                  onClick={handleRedirectToHumanizer}
                  className="w-full py-4 px-4 bg-emerald-500 text-white rounded-xl font-bold hover:bg-emerald-600 transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-100"
                >
                  <Sparkles size={18} />
                  Improve with Humanizer
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
