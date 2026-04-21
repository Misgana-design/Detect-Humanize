"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useHumanizer } from "@/hooks/useHumanizer";
import { Tone } from "@/services/ai/humanizerService";
import { Sparkles, Copy, Check, RotateCcw, FileText } from "lucide-react";

// We wrap the content in a Suspense boundary because useSearchParams()
// requires it for static rendering in Next.js
export default function HumanizePage() {
  return (
    <Suspense
      fallback={
        <div className="p-10 animate-pulse text-gray-400">
          Loading Humanizer...
        </div>
      }
    >
      <HumanizerContent />
    </Suspense>
  );
}

function HumanizerContent() {
  const searchParams = useSearchParams();
  const [text, setText] = useState("");
  const [tone, setTone] = useState<Tone>("professional");
  const [documentId, setDocumentId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const { mutate, data, isPending, error } = useHumanizer();

  // 1. SYNC WITH URL PARAMS
  useEffect(() => {
    const urlText = searchParams.get("text");
    const urlDocId = searchParams.get("documentId");

    if (urlText) setText(decodeURIComponent(urlText));
    if (urlDocId) setDocumentId(urlDocId);
  }, [searchParams]);

  const handleCopy = async () => {
    if (data?.humanizedText) {
      await navigator.clipboard.writeText(data.humanizedText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleHumanize = () => {
    // Pass the documentId here so the backend knows to UPDATE instead of INSERT
    mutate({ text, tone, documentId });
  };

  return (
    <div className="max-w-7xl mx-auto p-6 font-geist">
      <header className="mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
            AI Humanizer <Sparkles className="text-indigo-500" size={24} />
          </h1>
          <p className="text-gray-500 mt-2">
            Transform robotic AI text into natural phrasing.
          </p>
        </div>

        {documentId && (
          <div className="bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg flex items-center gap-2">
            <FileText size={14} className="text-amber-600" />
            <span className="text-[10px] font-bold text-amber-700 uppercase tracking-tight">
              Updating Existing Scan
            </span>
          </div>
        )}
      </header>

      {/* Control Bar */}
      <div className="flex items-center gap-4 mb-6 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
        <span className="text-sm font-medium text-gray-700">Select Tone:</span>
        {(["casual", "professional", "academic"] as Tone[]).map((t) => (
          <button
            key={t}
            onClick={() => setTone(t)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all hover:cursor-pointer ${
              tone === t
                ? "bg-black text-white shadow-md"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Input Column */}
        <div className="flex flex-col space-y-4">
          <div className="relative group">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste AI-generated text here..."
              className="w-full h-125 p-5 rounded-2xl border border-gray-200 shadow-sm focus:ring-2 focus:ring-black focus:border-transparent resize-none leading-relaxed text-gray-800"
            />
            {text && (
              <button
                onClick={() => setText("")}
                className="absolute top-4 right-4 p-2 bg-gray-100 text-gray-400 hover:text-gray-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <RotateCcw size={14} />
              </button>
            )}
          </div>
          <button
            onClick={handleHumanize}
            disabled={isPending || text.trim().length < 50}
            className="w-full py-4 px-4 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-indigo-100 flex items-center justify-center gap-2 hover:cursor-pointer"
          >
            {isPending ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Humanizing...
              </span>
            ) : (
              <>
                <Sparkles size={18} />
                {documentId ? "Update & Humanize" : "Humanize Text"}
              </>
            )}
          </button>
          {error && (
            <p className="text-red-500 text-xs font-medium text-center">
              {error.message}
            </p>
          )}
        </div>

        {/* Output Column */}
        <div className="flex flex-col space-y-4">
          <div className="w-full h-125 p-0 bg-gray-50 rounded-2xl border border-gray-200 shadow-sm overflow-hidden relative">
            {!data ? (
              <div className="flex h-full flex-col items-center justify-center text-gray-400 p-10 text-center">
                {isPending ? (
                  <div className="space-y-4">
                    <div className="flex justify-center">
                      <Sparkles
                        className="text-indigo-400 animate-bounce"
                        size={32}
                      />
                    </div>
                    <span className="text-sm font-medium animate-pulse text-indigo-500">
                      Rewriting magically...
                    </span>
                  </div>
                ) : (
                  <>
                    <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center shadow-sm mb-4">
                      <Sparkles className="text-gray-200" size={32} />
                    </div>
                    <p className="text-sm">
                      Your humanized text will appear here.
                    </p>
                  </>
                )}
              </div>
            ) : (
              <div className="h-full flex flex-col">
                <div className="flex-1 overflow-y-auto p-6 space-y-8">
                  <div className="prose prose-sm max-w-none text-gray-800 leading-relaxed font-medium">
                    {data.humanizedText}
                  </div>

                  {/* Changes List */}
                  {data.changes && data.changes.length > 0 && (
                    <div className="pt-6 border-t border-gray-100">
                      <h3 className="text-xl font-mono text-green-500 uppercase mb-4 tracking-widest">
                        Improvements Made
                      </h3>
                      <ul className="grid grid-cols-1 gap-2">
                        {data.changes.map((change, i) => (
                          <li
                            key={i}
                            className="text-xs text-gray-600 flex items-start gap-2 bg-white p-2 rounded-lg border font-serif border-gray-100"
                          >
                            <Check
                              className="text-emerald-500 mt-0.5"
                              size={12}
                            />
                            {change}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <button
            onClick={handleCopy}
            disabled={!data || isPending}
            className={`w-full py-4 px-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 hover:cursor-pointer ${
              copied
                ? "bg-emerald-50 text-emerald-600 border border-emerald-200"
                : "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 shadow-sm"
            }`}
          >
            {copied ? (
              <>
                <Check size={18} />
                Copied to Clipboard!
              </>
            ) : (
              <>
                <Copy size={18} />
                Copy Result
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
