import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ArrowRight, CheckCircle2, Star } from "lucide-react";
import { buildBreadcrumbJsonLd, buildMetadata } from "@/lib/seo";
import { useCasePages } from "@/lib/seo-content";
import { StructuredData } from "@/components/seo/StructuredData";

type Props = { params: Promise<{ usecase: string }> };

export async function generateStaticParams() {
  return useCasePages.map((u) => ({ usecase: u.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { usecase } = await params;
  const page = useCasePages.find((u) => u.slug === usecase);
  if (!page) return {};
  return buildMetadata({
    title: page.title,
    description: page.description,
    path: `/use-cases/${page.slug}`,
    keywords: page.keywords,
  });
}

export default async function UseCasePage({ params }: Props) {
  const { usecase } = await params;
  const page = useCasePages.find((u) => u.slug === usecase);
  if (!page) notFound();

  return (
    <div className="mx-auto max-w-4xl px-4 py-12">
      <StructuredData
        data={buildBreadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Use Cases", path: "/use-cases" },
          { name: page.title, path: `/use-cases/${page.slug}` },
        ])}
      />

      <Link
        href="/use-cases"
        className="mb-8 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-indigo-600"
      >
        <ArrowLeft size={14} /> All use cases
      </Link>

      {/* Hero */}
      <header className="mb-12">
        <span className="mb-4 inline-flex rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700">
          For {page.audience}
        </span>
        <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
          {page.headline}
        </h1>
        <p className="mt-4 text-lg text-slate-500">{page.description}</p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link
            href="/auth/signup"
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-100 transition hover:bg-indigo-700"
          >
            Start free <ArrowRight size={14} />
          </Link>
          <Link
            href="/pricing"
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
          >
            View pricing
          </Link>
        </div>
      </header>

      {/* Pain points */}
      <section className="mb-12">
        <h2 className="mb-5 text-xl font-bold text-slate-900">
          Sound familiar?
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {page.painPoints.map((point) => (
            <div
              key={point}
              className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4"
            >
              <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-indigo-400" />
              <p className="text-sm text-slate-700">{point}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Benefits */}
      <section className="mb-12">
        <h2 className="mb-6 text-xl font-bold text-slate-900">
          How Text Humanica helps
        </h2>
        <div className="grid gap-5 sm:grid-cols-2">
          {page.benefits.map((benefit) => (
            <div
              key={benefit.title}
              className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
            >
              <div className="mb-3 text-2xl">{benefit.icon}</div>
              <h3 className="font-bold text-slate-900">{benefit.title}</h3>
              <p className="mt-2 text-sm leading-7 text-slate-600">{benefit.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Testimonial */}
      <section className="mb-12 rounded-3xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-sky-50 p-8">
        <div className="flex gap-0.5 text-amber-400">
          {[...Array(5)].map((_, i) => (
            <Star key={i} size={16} className="fill-current" />
          ))}
        </div>
        <blockquote className="mt-4 text-base font-medium leading-7 text-slate-800">
          &ldquo;{page.testimonial.quote}&rdquo;
        </blockquote>
        <div className="mt-4">
          <p className="text-sm font-bold text-slate-900">{page.testimonial.name}</p>
          <p className="text-xs text-slate-500">{page.testimonial.role}</p>
        </div>
      </section>

      {/* CTA */}
      <div className="rounded-3xl bg-gradient-to-br from-indigo-600 to-sky-500 px-8 py-10 text-center shadow-xl shadow-indigo-100">
        <h2 className="text-xl font-extrabold text-white sm:text-2xl">
          Start free — no credit card required
        </h2>
        <p className="mt-2 text-sm text-indigo-100">
          1,000 words/month free · Results in under 10 seconds
        </p>
        <Link
          href="/auth/signup"
          className="mt-5 inline-flex items-center gap-2 rounded-2xl bg-white px-6 py-3 text-sm font-bold text-indigo-700 shadow-lg transition hover:bg-indigo-50"
        >
          Get started free <ArrowRight size={14} />
        </Link>
      </div>

      {/* Other use cases */}
      <div className="mt-12">
        <h2 className="mb-5 text-lg font-bold text-slate-900">Other use cases</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          {useCasePages
            .filter((u) => u.slug !== page.slug)
            .map((u) => (
              <Link
                key={u.slug}
                href={`/use-cases/${u.slug}`}
                className="group flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 transition hover:border-indigo-200 hover:shadow-sm"
              >
                <div>
                  <span className="text-xs font-bold text-slate-400">{u.audience}</span>
                  <p className="text-sm font-semibold text-slate-800 group-hover:text-indigo-600">
                    {u.title}
                  </p>
                </div>
                <ArrowRight size={14} className="text-slate-400 group-hover:text-indigo-500" />
              </Link>
            ))}
        </div>
      </div>
    </div>
  );
}
