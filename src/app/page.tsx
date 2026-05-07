import type { Metadata } from "next";
import { HomePageClient } from "@/components/home/HomePageClient";
import { StructuredData } from "@/components/seo/StructuredData";
import { buildBreadcrumbJsonLd, buildMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({
    title: "AI Detector & Humanizer",
    description:
      "Paste or upload text, detect whether it reads like AI, and route directly into the best next workflow.",
    path: "/",
  });
}

export default function HomePage() {
  return (
    <>
      <StructuredData
        data={buildBreadcrumbJsonLd([{ name: "Home", path: "/" }])}
      />
      <HomePageClient />
    </>
  );
}
