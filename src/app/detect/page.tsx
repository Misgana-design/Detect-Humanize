"use client";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { FileUp, Search } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export default function DetectPage() {
  const [text, setText] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<null | number>(null);

  const handleAnalyze = () => {
    setAnalyzing(true);
    // Simulate API call
    setTimeout(() => {
      setAnalyzing(false);
      setResult(84);
    }, 2000);
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <header className="space-y-2">
        <h1 className="text-3xl font-bold">AI Content Detector</h1>
        <p className="text-slate-500">
          Paste your text below to check for AI-generated patterns.
        </p>
      </header>

      <div className="grid lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-4">
          <div className="relative group">
            <textarea
              className="w-full h-[400px] p-6 bg-white border border-slate-200 rounded-2xl shadow-sm focus:ring-4 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all resize-none outline-none"
              placeholder="Paste your content here (minimum 50 words)..."
              value={text}
              onChange={(e) => setText(e.target.value)}
            />
            <div className="absolute bottom-4 right-4 flex items-center gap-3">
              <span className="text-xs text-slate-400 font-medium">
                {text.length} characters
              </span>
              <button className="p-2 text-slate-400 hover:text-indigo-600 transition-colors">
                <FileUp className="w-5 h-5" />
              </button>
            </div>
          </div>
          <Button
            className="w-full"
            size="lg"
            onClick={handleAnalyze}
            disabled={analyzing || text.length < 50}
          >
            {analyzing ? "Analyzing Patterns..." : "Run AI Detection Analysis"}
          </Button>
        </div>

        <aside>
          <AnimatePresence mode="wait">
            {!result ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="h-full flex flex-col items-center justify-center p-8 border-2 border-dashed border-slate-200 rounded-2xl text-center space-y-4"
              >
                <Search className="w-12 h-12 text-slate-300" />
                <p className="text-sm text-slate-500">
                  Analysis results will appear here after scanning.
                </p>
              </motion.div>
            ) : (
              <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="p-8 bg-white border border-slate-200 rounded-2xl shadow-lg space-y-6"
              >
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-32 h-32 rounded-full border-8 border-rose-50 mb-4">
                    <span className="text-4xl font-bold text-rose-600">
                      {result}%
                    </span>
                  </div>
                  <h3 className="text-xl font-bold">Likely AI Generated</h3>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Burstiness</span>
                    <span className="font-semibold">Low</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Perplexity</span>
                    <span className="font-semibold">12.4</span>
                  </div>
                </div>

                <Button variant="outline" className="w-full">
                  Download Report
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </aside>
      </div>
    </div>
  );
}
