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
    // POLAR_BACKUP: title: "Undetectable AI Detector & Humanizer"
    title: "AI Detector & Writing Humanizer",
    description:
      // POLAR_BACKUP: "Detect AI content, humanize AI text, bypass GPTZero-style detection, and rewrite ChatGPT drafts into natural, plagiarism-free writing."
      "Detect AI content, humanize AI text into natural language, and rewrite ChatGPT drafts into authentic, original writing.",
    path: "/",
    keywords: [
      // POLAR_BACKUP: "undetectable AI detector", "bypass GPTZero"
      "AI writing detector",
      "humanize ChatGPT text",
      "improve AI writing",
      "AI writing assistant",
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
      <HomePageClient />
    </>
  );
}
