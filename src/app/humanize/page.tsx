import { Suspense } from "react";
import type { Metadata } from "next";
import { HumanizerPageClient } from "@/components/humanize/HumanizerPageClient";
import { StructuredData } from "@/components/seo/StructuredData";
import { buildBreadcrumbJsonLd, buildMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({
    title: "AI Humanizer",
    description:
      "Upload or paste robotic drafts, rewrite them in your preferred tone, and review the changes in one focused screen.",
    path: "/humanize",
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
