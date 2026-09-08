import { Suspense } from "react";
import type { Metadata } from "next";
import { HomePageClient } from "@/components/home/HomePageClient";
import { StructuredData } from "@/components/seo/StructuredData";
import {
  buildBreadcrumbJsonLd,
  buildMetadata,
  buildSoftwareApplicationJsonLd,
} from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({
    title: "AI Humanizer for Natural Writing",
    description:
      "Humanize AI text and rewrite ChatGPT drafts into natural, polished, plagiarism-free writing.",
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
      <StructuredData
        data={buildBreadcrumbJsonLd([{ name: "Home", path: "/" }])}
      />
      <StructuredData data={buildSoftwareApplicationJsonLd()} />
      <Suspense fallback={<div className="min-h-screen bg-slate-50" />}>
        <HomePageClient />
      </Suspense>
    </>
  );
}
