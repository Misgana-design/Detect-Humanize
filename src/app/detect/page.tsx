import { Suspense } from "react";
import type { Metadata } from "next";
import { DetectorPageClient } from "@/components/detect/DetectorPageClient";
import { StructuredData } from "@/components/seo/StructuredData";
import { buildBreadcrumbJsonLd, buildMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({
    title: "AI Detector",
    description:
      "Upload or paste text to inspect AI probability, flagged passages, and detailed detector analysis.",
    path: "/detect",
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
