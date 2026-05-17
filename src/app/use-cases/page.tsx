import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { buildBreadcrumbJsonLd, buildMetadata } from "@/lib/seo";
import { useCasePages } from "@/lib/seo-content";
import { StructuredData } from "@/components/seo/StructuredData";

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({
    title: "AI Detector & Humanizer Use Cases",
    description:
      "Text Humanica for students, researchers, SEO writers, content agencies, and academic writing. Find the right plan and workflow for your use case.",
    path: "/use-cases",
    keywords: [
      "ai humanizer for students",
      "ai detector for researchers",
      "ai humanizer for seo writers",
      "ai detector use cases",
    ],
  });
}

export default function UseCasesIndexPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <StructuredData
        data={buildBreadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Use Cases", path: "/use-cases" },
        ])}
      />

      <header className="mb-12 text-center">
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-indigo-600">
          Use Cases
        </p>
        <h1 className="mt-3 text-4xl font-extrabold tracking-tight text-slate-900">
          Built for your workflow
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base text-slate-500">
          Whether you&apos;re a student, researcher, SEO writer, or content agency —
          Text Humanica has a plan and workflow designed for you.
        </p>
      </header>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {useCasePages.map((uc) => (
          <Link
            key={uc.slug}
            href={`/use-cases/${uc.slug}`}
            className="group flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-indigo-200 hover:shadow-md"
          >
            <span className="mb-3 inline-flex w-fit rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-600">
              {uc.audience}
            </span>
            <h2 className="flex-1 text-base font-bold leading-snug text-slate-900 transition group-hover:text-indigo-600">
              {uc.title}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-500 line-clamp-2">
              {uc.headline}
            </p>
            <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-indigo-600">
              Learn more <ArrowRight size={12} />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
