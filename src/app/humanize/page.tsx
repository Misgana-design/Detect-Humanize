import { Suspense } from "react";
import type { Metadata } from "next";
import { HumanizerPageClient } from "@/components/humanize/HumanizerPageClient";
import { StructuredData } from "@/components/seo/StructuredData";
import { buildBreadcrumbJsonLd, buildMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({
    // POLAR_BACKUP: title: "AI Humanizer to Bypass GPTZero & Humanize ChatGPT Text"
    title: "AI Humanizer — Rewrite AI Text into Natural, Authentic Language",
    description:
      "Humanize AI text from ChatGPT, Claude, or Gemini with natural tone, stronger burstiness, and cleaner phrasing that reads as genuinely human-written.",
    path: "/humanize",
    keywords: [
      "AI humanizer",
      "humanize AI text",
      // POLAR_BACKUP: "bypass GPTZero", "undetectable AI text"
      "improve AI writing",
      "natural language rewriter",
    ],
  });
}

export default function HumanizePage() {
  return (
    <>
      <StructuredData
        data={buildBreadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Humanizer", path: "/humanize" },
        ])}
      />
      <Suspense fallback={<div className="p-10 text-slate-400">Loading humanizer...</div>}>
        <HumanizerPageClient />
      </Suspense>
    </>
  );
}
