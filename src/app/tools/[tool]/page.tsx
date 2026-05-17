import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, X } from "lucide-react";
import { buildBreadcrumbJsonLd, buildMetadata } from "@/lib/seo";
import { toolPages } from "@/lib/seo-content";
import { StructuredData } from "@/components/seo/StructuredData";

type Props = { params: Promise<{ tool: string }> };

export async function generateStaticParams() {
  return toolPages.map((t) => ({ tool: t.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { tool } = await params;
  const page = toolPages.find((t) => t.slug === tool);
  if (!page) return {};
  return buildMetadata({
    title: page.title,
    description: page.description,
    path: `/tools/${page.slug}`,
    keywords: page.keywords,
  });
}

export default async function ToolComparisonPage({ params }: Props) {
  const { tool } = await params;
  const page = toolPages.find((t) => t.slug === tool);
  if (!page) notFound();

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <StructuredData
        data={buildBreadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Comparisons", path: "/tools" },
          { name: `vs ${page.competitor}`, path: `/tools/${page.slug}` },
        ])}
      />

      <Link
        href="/tools"
        className="mb-8 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-indigo-600"
      >
        <ArrowLeft size={14} /> All comparisons
      </Link>

      {/* Header */}
      <header className="mb-10">
        <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700">
          Text Humanica vs {page.competitor}
        </div>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
          {page.title}
        </h1>
        <p className="mt-4 text-lg text-slate-500">{page.description}</p>
      </header>

      {/* Verdict */}
      <div className="mb-10 rounded-2xl border border-indigo-100 bg-indigo-50 p-6">
        <p className="text-xs font-bold uppercase tracking-widest text-indigo-500">
          Our verdict
        </p>
        <p className="mt-2 text-base font-semibold text-slate-800">{page.verdict}</p>
      </div>

      {/* Comparison table */}
      <div className="mb-10 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="grid grid-cols-3 border-b border-slate-100 bg-slate-50 px-5 py-3 text-xs font-bold uppercase tracking-widest text-slate-400">
          <span>Feature</span>
          <span className="text-indigo-600">Text Humanica</span>
          <span>{page.competitor}</span>
        </div>
        {page.comparison.map((row, i) => (
          <div
            key={row.feature}
            className={`grid grid-cols-3 items-center px-5 py-3.5 text-sm ${
              i % 2 === 0 ? "bg-white" : "bg-slate-50/50"
            }`}
          >
            <span className="font-medium text-slate-700">{row.feature}</span>
            <span className="font-semibold text-indigo-700">{row.us}</span>
            <span className="text-slate-500">{row.them}</span>
          </div>
        ))}
      </div>

      {/* Pros & cons */}
      <div className="mb-10 grid gap-5 sm:grid-cols-2">
        <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5">
          <p className="mb-3 text-xs font-bold uppercase tracking-widest text-emerald-600">
            Why Text Humanica wins
          </p>
          <ul className="space-y-2">
            {page.pros.map((pro) => (
              <li key={pro} className="flex items-start gap-2 text-sm text-slate-700">
                <Check size={14} className="mt-0.5 shrink-0 text-emerald-500" />
                {pro}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <p className="mb-3 text-xs font-bold uppercase tracking-widest text-slate-400">
            Where {page.competitor} has an edge
          </p>
          <ul className="space-y-2">
            {page.cons.map((con) => (
              <li key={con} className="flex items-start gap-2 text-sm text-slate-600">
                <X size={14} className="mt-0.5 shrink-0 text-slate-400" />
                {con}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* CTA */}
      <div className="rounded-3xl bg-gradient-to-br from-indigo-600 to-sky-500 px-8 py-10 text-center shadow-xl shadow-indigo-100">
        <h2 className="text-xl font-extrabold text-white sm:text-2xl">
          Try Text Humanica free — no credit card required
        </h2>
        <p className="mt-2 text-sm text-indigo-100">
          1,000 words/month free · Full 3-stage humanizer on Pro
        </p>
        <div className="mt-5 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
          <Link
            href="/auth/signup"
            className="inline-flex items-center gap-2 rounded-2xl bg-white px-6 py-3 text-sm font-bold text-indigo-700 shadow-lg transition hover:bg-indigo-50"
          >
            Get started free <ArrowRight size={14} />
          </Link>
          <Link
            href="/pricing"
            className="inline-flex items-center gap-2 rounded-2xl border border-white/30 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            View pricing
          </Link>
        </div>
      </div>

      {/* Related comparisons */}
      <div className="mt-12">
        <h2 className="mb-5 text-lg font-bold text-slate-900">More comparisons</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {toolPages
            .filter((t) => t.slug !== page.slug)
            .slice(0, 4)
            .map((t) => (
              <Link
                key={t.slug}
                href={`/tools/${t.slug}`}
                className="group flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 transition hover:border-indigo-200 hover:shadow-sm"
              >
                <span className="text-sm font-semibold text-slate-800 group-hover:text-indigo-600">
                  vs {t.competitor}
                </span>
                <ArrowRight size={14} className="text-slate-400 group-hover:text-indigo-500" />
              </Link>
            ))}
        </div>
      </div>
    </div>
  );
}
