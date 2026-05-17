import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { buildBreadcrumbJsonLd, buildMetadata } from "@/lib/seo";
import { toolPages } from "@/lib/seo-content";
import { StructuredData } from "@/components/seo/StructuredData";

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({
    title: "Text Humanica vs Other AI Detectors & Humanizers",
    description:
      "How does Text Humanica compare to GPTZero, Turnitin, Originality.ai, Grammarly, QuillBot, and Undetectable AI? Side-by-side comparisons with real accuracy data.",
    path: "/tools",
    keywords: [
      "ai detector comparison",
      "best ai humanizer comparison",
      "gptzero alternative",
      "turnitin alternative",
      "originality ai alternative",
    ],
  });
}

export default function ToolsIndexPage() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <StructuredData
        data={buildBreadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Comparisons", path: "/tools" },
        ])}
      />

      <header className="mb-12 text-center">
        <p className="text-sm font-bold uppercase tracking-[0.2em] text-indigo-600">
          Comparisons
        </p>
        <h1 className="mt-3 text-4xl font-extrabold tracking-tight text-slate-900">
          Text Humanica vs the competition
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base text-slate-500">
          Side-by-side comparisons with real accuracy data, bypass rates, and
          pricing — so you can choose the right tool for your needs.
        </p>
      </header>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {toolPages.map((tool) => (
          <Link
            key={tool.slug}
            href={`/tools/${tool.slug}`}
            className="group flex flex-col rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition hover:border-indigo-200 hover:shadow-md"
          >
            <div className="mb-3 flex items-center gap-2">
              <span className="rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-bold text-indigo-700">
                vs {tool.competitor}
              </span>
            </div>
            <h2 className="flex-1 text-base font-bold leading-snug text-slate-900 transition group-hover:text-indigo-600">
              {tool.title}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-slate-500 line-clamp-2">
              {tool.description}
            </p>
            <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-indigo-600">
              See comparison <ArrowRight size={12} />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
