"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

export function FaqAccordion({
  entries,
}: {
  entries: Array<{ question: string; answer: string }>;
}) {
  const [openIndex, setOpenIndex] = useState<number>(0);

  return (
    <div className="space-y-4">
      {entries.map((entry, index) => {
        const isOpen = openIndex === index;

        return (
          <article
            key={entry.question}
            className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
          >
            <button
              className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left hover:cursor-pointer"
              onClick={() => setOpenIndex(isOpen ? -1 : index)}
              aria-expanded={isOpen}
            >
              <h2 className="text-base font-semibold text-slate-900">
                {entry.question}
              </h2>
              <ChevronDown
                className={`h-5 w-5 shrink-0 text-slate-500 transition-transform ${
                  isOpen ? "rotate-180" : ""
                }`}
              />
            </button>
            {isOpen && (
              <div className="border-t border-slate-100 px-5 py-4 text-sm leading-7 text-slate-600">
                {entry.answer}
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}
