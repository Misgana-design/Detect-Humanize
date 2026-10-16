import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowRight, Check, Zap, Shield, BookOpen, Pencil } from "lucide-react";
import {
  pseoSlugs,
  slugToTitle,
  slugToDescription,
  slugToH1,
  slugToBodyIntro,
  slugToKeyword,
} from "@/lib/pseo-slugs";

type Props = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  return pseoSlugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  if (!pseoSlugs.includes(slug)) return {};

  const title = slugToTitle(slug);
  const description = slugToDescription(slug);
  const canonical = `https://texthumanica.com/tools/pseo/${slug}`;

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      siteName: "Text Humanica",
      type: "website",
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
    },
  };
}

const USE_CASES = [
  {
    icon: BookOpen,
    label: "Academic Writing",
    body: "Bypass Turnitin and GPTZero before submitting essays, theses, and research papers.",
  },
  {
    icon: Pencil,
    label: "Blog & SEO Content",
    body: "Pass Originality.ai and rank without Google spam filters flagging your content.",
  },
  {
    icon: Zap,
    label: "Fast Processing",
    body: "3-stage pipeline completes in under 15 seconds for most documents.",
  },
  {
    icon: Shield,
    label: "No Plagiarism",
    body: "Meaning is preserved throughout the rewrite — no text is fabricated or replaced with unrelated content.",
  },
];

const STEPS = [
  { n: "1", heading: "Paste your AI text", body: "Copy your ChatGPT, Claude, or Gemini output and paste it into the editor." },
  { n: "2", heading: "Choose your tone", body: "Select from 8 tones: Casual, Academic, Professional, Persuasive, Formal, Friendly, Creative, or Simple." },
  { n: "3", heading: "Click Humanize", body: "The 3-stage pipeline (Analysis → Rewrite → Polish) runs in under 15 seconds." },
  { n: "4", heading: "Verify and download", body: "Check the AI probability score and download or copy the result." },
];

const FAQ_ITEMS = [
  {
    q: "Is Text Humanica free?",
    a: "Yes — the free plan gives you 1,000 words per month with no credit card required. Paid plans start at $5.99/month for 4,000 words.",
  },
  {
    q: "Does the humanized text pass GPTZero and Turnitin?",
    a: "Pro plan output consistently scores below detection thresholds on GPTZero, Turnitin, Originality.ai, and Copyleaks in our testing. Results vary by text length and original content.",
  },
  {
    q: "Will it change the meaning of my text?",
    a: "No. The 3-stage pipeline is designed to preserve meaning while restructuring phrasing, sentence length, and vocabulary to read naturally.",
  },
  {
    q: "How many words can I humanize at once?",
    a: "Free and Basic plans support up to 500 words per input. Pro supports 1,500 words. Ultra supports 2,500 words.",
  },
];

export default async function PseoToolPage({ params }: Props) {
  const { slug } = await params;

  if (!pseoSlugs.includes(slug)) notFound();

  const h1 = slugToH1(slug);
  const intro = slugToBodyIntro(slug);
  const kw = slugToKeyword(slug);

  // Pick 4 related slugs for cross-linking
  const related = pseoSlugs
    .filter((s) => s !== slug)
    .sort(() => 0.5 - Math.random())
    .slice(0, 4);

  return (
    <>
      {/* JSON-LD: WebPage + FAQPage */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@graph": [
              {
                "@type": "WebPage",
                name: h1,
                url: `https://texthumanica.com/tools/pseo/${slug}`,
                description: slugToDescription(slug),
                isPartOf: { "@type": "WebSite", url: "https://texthumanica.com" },
              },
              {
                "@type": "FAQPage",
                mainEntity: FAQ_ITEMS.map(({ q, a }) => ({
                  "@type": "Question",
                  name: q,
                  acceptedAnswer: { "@type": "Answer", text: a },
                })),
              },
            ],
          }),
        }}
      />

      <div className="mx-auto max-w-4xl px-4 py-12">
        {/* Breadcrumb */}
        <nav className="mb-8 flex items-center gap-1.5 text-xs text-slate-400">
          <Link href="/" className="hover:text-indigo-600">Home</Link>
          <span>/</span>
          <Link href="/tools" className="hover:text-indigo-600">Tools</Link>
          <span>/</span>
          <span className="text-slate-600">{kw}</span>
        </nav>

        {/* Hero */}
        <header className="mb-10">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-indigo-50 px-3 py-1 text-xs font-bold text-indigo-700">
            Free AI Humanizer
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
            {h1}
          </h1>
          <p className="mt-4 text-lg leading-relaxed text-slate-500">{intro}</p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/humanize"
              className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-6 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-200 transition hover:bg-indigo-700"
            >
              Try it free <ArrowRight size={14} />
            </Link>
            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-6 py-3 text-sm font-semibold text-slate-700 transition hover:border-indigo-200 hover:text-indigo-600"
            >
              View pricing
            </Link>
          </div>
        </header>

        {/* Use cases grid */}
        <section className="mb-12">
          <h2 className="mb-5 text-xl font-bold text-slate-900">
            Why people search for {kw}
          </h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {USE_CASES.map(({ icon: Icon, label, body }) => (
              <div
                key={label}
                className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm"
              >
                <div className="mb-2 flex items-center gap-2">
                  <Icon size={16} className="text-indigo-500" />
                  <span className="text-sm font-bold text-slate-800">{label}</span>
                </div>
                <p className="text-sm leading-relaxed text-slate-500">{body}</p>
              </div>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section className="mb-12 rounded-3xl bg-slate-50 p-8">
          <h2 className="mb-6 text-xl font-bold text-slate-900">
            How Text Humanica works
          </h2>
          <ol className="space-y-4">
            {STEPS.map(({ n, heading, body }) => (
              <li key={n} className="flex gap-4">
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">
                  {n}
                </span>
                <div>
                  <p className="text-sm font-bold text-slate-800">{heading}</p>
                  <p className="mt-0.5 text-sm text-slate-500">{body}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* Feature bullets */}
        <section className="mb-12">
          <h2 className="mb-5 text-xl font-bold text-slate-900">
            What sets Text Humanica apart
          </h2>
          <ul className="space-y-3">
            {[
              "3-stage pipeline: Analysis → Rewrite → Polish for the highest bypass rates",
              "Built-in AI detector with sentence-level flagging — no separate tool needed",
              "8 writing tones: Casual, Academic, Professional, Persuasive, Formal, Friendly, Creative, Simple",
              "File upload support: PDF, DOCX, TXT — text extracted automatically",
              "Full document history with side-by-side comparison mode",
              "1,000 free words per month — no credit card required",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2.5 text-sm text-slate-700">
                <Check size={15} className="mt-0.5 shrink-0 text-emerald-500" />
                {item}
              </li>
            ))}
          </ul>
        </section>

        {/* FAQ */}
        <section className="mb-12">
          <h2 className="mb-5 text-xl font-bold text-slate-900">
            Frequently asked questions
          </h2>
          <div className="divide-y divide-slate-100 rounded-2xl border border-slate-100 bg-white overflow-hidden">
            {FAQ_ITEMS.map(({ q, a }) => (
              <div key={q} className="px-6 py-5">
                <p className="text-sm font-bold text-slate-800">{q}</p>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{a}</p>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <div className="mb-12 rounded-3xl bg-linear-to-br from-indigo-600 to-sky-500 px-8 py-10 text-center shadow-xl shadow-indigo-100">
          <h2 className="text-xl font-extrabold text-white sm:text-2xl">
            Start humanizing for free
          </h2>
          <p className="mt-2 text-sm text-indigo-100">
            1,000 words/month free · No credit card · Results in under 15 seconds
          </p>
          <div className="mt-5 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/auth/signup"
              className="inline-flex items-center gap-2 rounded-2xl bg-white px-6 py-3 text-sm font-bold text-indigo-700 shadow-lg transition hover:bg-indigo-50"
            >
              Get started free <ArrowRight size={14} />
            </Link>
            <Link
              href="/humanize"
              className="inline-flex items-center gap-2 rounded-2xl border border-white/30 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              Try without signing up
            </Link>
          </div>
        </div>

        {/* Related pages */}
        <section>
          <h2 className="mb-4 text-base font-bold text-slate-900">Related tools</h2>
          <div className="grid gap-2.5 sm:grid-cols-2">
            {related.map((s) => (
              <Link
                key={s}
                href={`/tools/pseo/${s}`}
                className="group flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-700 transition hover:border-indigo-200 hover:text-indigo-600"
              >
                <span className="capitalize">{s.replace(/-/g, " ")}</span>
                <ArrowRight size={13} className="shrink-0 text-slate-400 group-hover:text-indigo-500" />
              </Link>
            ))}
          </div>
        </section>
      </div>
    </>
  );
}
