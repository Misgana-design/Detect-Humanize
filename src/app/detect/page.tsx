import { Suspense } from "react";
import type { Metadata } from "next";
import { DetectorPageClient } from "@/components/detect/DetectorPageClient";
import { StructuredData } from "@/components/seo/StructuredData";
import { buildBreadcrumbJsonLd, buildMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({
    // POLAR_BACKUP: title: "AI Detector for GPTZero, Turnitin & ChatGPT Text"
    title: "AI Content Detector — Check Writing Authenticity & AI Probability",
    description:
      // POLAR_BACKUP: "Upload or paste text to check AI probability, flagged passages, and detector signals before GPTZero, Turnitin, Originality.ai, or Copyleaks review."
      "Upload or paste text to check AI probability, flagged passages, and writing authenticity signals to improve your content before submission.",
    path: "/detect",
    keywords: [
      "AI detector",
      // POLAR_BACKUP: "GPTZero detector", "Turnitin AI detector"
      "AI probability checker",
      "writing authenticity checker",
      "AI content analysis",
    ],
  });
}

export default function DetectPage() {
  return (
    <>
      <StructuredData
        data={buildBreadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Detector", path: "/detect" },
        ])}
      />
      <Suspense fallback={<div className="p-10 text-slate-400">Loading detector...</div>}>
        <DetectorPageClient />
      </Suspense>
    </>
  );
}
