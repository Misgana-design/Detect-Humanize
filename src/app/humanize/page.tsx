"use client";

import { useState } from "react";
import { useHumanizer } from "@/hooks/useHumanizer";
import { Tone } from "@/services/ai/humanizerService";

export default function HumanizePage() {
  const [text, setText] = useState("");
  const [tone, setTone] = useState<Tone>("professional");
  const [copied, setCopied] = useState(false);

  const { mutate, data, isPending, error } = useHumanizer();

  const handleCopy = async () => {
    if (data?.humanizedText) {
      await navigator.clipboard.writeText(data.humanizedText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="max-w-7xl mx-auto p-6 font-geist">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-gray-900">
          AI Humanizer
        </h1>
        <p className="text-gray-500 mt-2">
          Transform robotic AI text into natural phrasing.
        </p>
      </header>

      {/* Control Bar */}
      <div className="flex items-center gap-4 mb-6 bg-white p-4 rounded-xl border border-gray-100 shadow-sm">
        <span className="text-sm font-medium text-gray-700">Select Tone:</span>
        {(["casual", "professional", "academic"] as Tone[]).map((t) => (
          <button
            key={t}
            onClick={() => setTone(t)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-all ${
              tone === t
                ? "bg-black text-white"
                : "bg-gray-100 text-gray-600 hover:bg-gray-200"
            }`}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Editor Grid */}
      <div className="grid md:grid-cols-2 gap-6">
        {/* Input Column */}
        <div className="flex flex-col space-y-4">
          <div className="relative">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste AI-generated text here..."
              className="w-full h-125 p-5 rounded-xl border border-gray-200 shadow-sm focus:ring-2 focus:ring-black focus:border-transparent resize-none leading-relaxed"
            />
          </div>
          <button
            onClick={() => mutate({ text, tone })}
            disabled={isPending || text.trim().length === 0}
            className="w-full py-3 px-4 bg-black text-white rounded-lg font-medium hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {isPending ? "Humanizing..." : "Humanize Text"}
          </button>
          {error && <p className="text-red-500 text-sm">{error.message}</p>}
        </div>

        {/* Output Column */}
        <div className="flex flex-col space-y-4">
          <div className="w-full h-125 p-5 bg-gray-50 rounded-xl border border-gray-200 shadow-sm overflow-y-auto relative">
            {!data ? (
              <div className="flex h-full items-center justify-center text-gray-400">
                {isPending ? (
                  <span className="animate-pulse">Rewriting magically...</span>
                ) : (
                  "Your humanized text will appear here."
                )}
              </div>
            ) : (
              <div className="space-y-6">
                <div className="prose prose-sm max-w-none text-gray-800 leading-relaxed">
                  {data.humanizedText}
                </div>

                {/* Changes List */}
                <div className="mt-8 pt-6 border-t border-gray-200">
                  <h3 className="text-sm font-semibold text-gray-900 mb-3">
                    What we changed:
                  </h3>
                  <ul className="space-y-2">
                    {data.changes.map((change, i) => (
                      <li
                        key={i}
                        className="text-sm text-gray-600 flex items-start"
                      >
                        <span className="mr-2 text-green-500">✓</span>
                        {change}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>

          <button
            onClick={handleCopy}
            disabled={!data || isPending}
            className="w-full py-3 px-4 bg-white border border-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-50 disabled:opacity-50 transition-colors"
          >
            {copied ? "Copied to Clipboard!" : "Copy Result"}
          </button>
        </div>
      </div>
    </div>
  );
}
