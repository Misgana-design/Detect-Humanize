import { Suspense } from "react";
import type { Metadata } from "next";
import { HumanizerPageClient } from "@/components/humanize/HumanizerPageClient";
import { StructuredData } from "@/components/seo/StructuredData";
import { buildBreadcrumbJsonLd, buildMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({
    title: "AI Humanizer — Bypass GPTZero, Humanize AI Text",
    description:
      "Humanize AI text from ChatGPT, Claude, or Gemini with natural tone, stronger burstiness, and cleaner phrasing that reads as genuinely human-written.",
    path: "/humanize",
    keywords: [
      "AI humanizer",
      "humanize AI text",
      "bypass GPTZero",
      "undetectable AI text",
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
      {/* H1 for SEO — visually hidden so it does not disrupt the tool UI */}
      <h1 className="sr-only">AI Humanizer — Bypass GPTZero, Humanize AI Text</h1>
      <Suspense fallback={<div className="p-10 text-slate-400">Loading humanizer...</div>}>
        <HumanizerPageClient />
      </Suspense>
    </>
  );
}
