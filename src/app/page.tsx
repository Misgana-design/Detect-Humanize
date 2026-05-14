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
    title: "Undetectable AI Detector & Humanizer",
    description:
      "Detect AI content, humanize AI text, bypass GPTZero-style detection, and rewrite ChatGPT drafts into natural, plagiarism-free writing.",
    path: "/",
    keywords: [
      "undetectable AI detector",
      "humanize ChatGPT text",
      "bypass GPTZero",
      "AI writing detector",
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
