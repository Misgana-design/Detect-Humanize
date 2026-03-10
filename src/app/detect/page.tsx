// src/app/detect/page.tsx
"use client";
import { useState } from "react";
import { useDetection } from "@/hooks/useDetection";
import { Button } from "@/components/ui/Button"; // Assuming you have shadcn/ui or similar

export default function DetectPage() {
  const [text, setText] = useState("");
  const { mutate, data, isPending, error } = useDetection();

  // ARCHITECTURE DECISION: Regex Splitter for Highlighting.
  // We split by standard sentence terminators, keeping the delimiters,
  // then check if each segment exists in the flagged array.
  const renderHighlightedText = (content: string, flagged: string[]) => {
    // Splits by punctuation but keeps the punctuation in the array
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
              ? "bg-red-200 text-red-900 rounded-sm px-1 py-0.5 transition-colors"
              : ""
          }
        >
          {segment}
        </span>
      );
    });
  };

  return (
    <div className="max-w-5xl mx-auto p-6 grid md:grid-cols-2 gap-8">
      {/* Input Section */}
      <div className="space-y-4">
        <h1 className="text-2xl font-bold">AI Content Detector</h1>
        <textarea
          className="w-full h-96 p-4 border rounded-xl resize-none focus:ring-2 focus:ring-blue-500"
          placeholder="Paste text here to analyze..."
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <Button
          onClick={() => mutate(text)}
          disabled={isPending || text.length < 50}
          className="w-full"
        >
          {isPending ? "Analyzing..." : "Analyze Content"}
        </Button>
        {error && <p className="text-red-500 text-sm">{error.message}</p>}
      </div>

      {/* Results Section */}
      <div className="bg-slate-50 border rounded-xl p-6 h-125 overflow-y-auto">
        {!data ? (
          <div className="h-full flex items-center justify-center text-slate-400">
            Results will appear here
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex justify-between items-center border-b pb-4">
              <h2 className="text-lg font-semibold">Analysis complete</h2>
              <div
                className={`px-4 py-1 rounded-full font-bold ${
                  data.aiProbability > 50
                    ? "bg-red-100 text-red-700"
                    : "bg-green-100 text-green-700"
                }`}
              >
                {data.aiProbability}% AI Probability
              </div>
            </div>

            <p className="text-sm text-slate-600 italic">
              {data.analysis} {data.cached && "(Served from Cache ⚡)"}
            </p>

            <div className="bg-white p-4 rounded-lg border leading-relaxed text-slate-800">
              {renderHighlightedText(text, data.flaggedSentences)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
