import { Suspense } from "react";
import type { Metadata } from "next";
import { HomePageClient } from "@/components/home/HomePageClient";
import { StructuredData } from "@/components/seo/StructuredData";
import {
  buildMetadata,
  buildSoftwareApplicationJsonLd,
} from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({
    title: "AI Humanizer for Natural Writing",
    description:
      "Humanize AI text from ChatGPT, Claude, or Gemini into natural, polished writing that bypasses GPTZero, Turnitin, and Originality.ai detection.",
    path: "/",
    keywords: [
      "humanize ChatGPT text",
      "AI humanizer",
      "humanize AI text",
      "bypass GPTZero",
      "undetectable AI",
    ],
  });
}

export default function HomePage() {
  return (
    <>
      <StructuredData data={buildSoftwareApplicationJsonLd()} />
      <Suspense fallback={<div className="min-h-screen bg-slate-50" />}>
        <HomePageClient />
      </Suspense>
    </>
  );
}
