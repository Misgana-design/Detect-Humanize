import type { Metadata } from "next";
import { FaqAccordion } from "@/components/faq/FaqAccordion";
import { StructuredData } from "@/components/seo/StructuredData";
import { buildBreadcrumbJsonLd, buildFaqJsonLd, buildMetadata } from "@/lib/seo";
import { faqEntries } from "@/lib/site";

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({
    title: "AI Detector & Humanizer FAQ",
    description:
      // POLAR_BACKUP: "Answers about Text Humanica accuracy, AI humanization, GPTZero bypass workflows, Turnitin-style detection, uploads, privacy, and plan limits."
      "Answers about Text Humanica accuracy, AI humanization, writing authenticity, uploads, privacy, and plan limits.",
    path: "/faq",
    keywords: [
      "AI detector FAQ",
      "AI humanizer questions",
      // POLAR_BACKUP: "GPTZero bypass FAQ"
      "writing authenticity FAQ",
      "humanize AI text safely",
    ],
  });
}

export default function FaqPage() {
  return (
    <section className="mx-auto max-w-4xl px-4 py-12">
      <StructuredData
        data={buildBreadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "FAQ", path: "/faq" },
        ])}
      />
      <StructuredData data={buildFaqJsonLd(faqEntries)} />

      <header className="mb-10 text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-indigo-600">
          FAQ
        </p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight text-slate-900">
          Frequently asked questions
        </h1>
        <p className="mt-4 text-base text-slate-600">
          Everything you need to know about Text Humanica.
        </p>
      </header>

      <FaqAccordion entries={faqEntries} />
    </section>
  );
}
