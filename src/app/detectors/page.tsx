import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, CheckCircle2, ShieldCheck } from "lucide-react";
import { StructuredData } from "@/components/seo/StructuredData";
import { buildBreadcrumbJsonLd, buildMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({
    title: "AI Detectors We Help You Bypass",
    description:
      "Text Humanica is engineered to produce text that passes GPTZero, Turnitin, Originality.ai, Copyleaks, Winston AI, and more.",
    path: "/detectors",
    keywords: ["bypass GPTZero", "bypass Turnitin", "bypass Originality.ai", "AI humanizer"],
  });
}

// ── Detector data ─────────────────────────────────────────────────────────────

const detectors = [
  {
    name: "GPTZero",
    url: "https://gptzero.me",
    description:
      "The most widely used AI detector in academic settings. GPTZero scores text on perplexity and burstiness — the two metrics our humanizer is specifically engineered to maximize.",
    category: "Academic",
    bypassRate: "~96%",
    color: "indigo",
  },
  {
    name: "Turnitin",
    url: "https://turnitin.com",
    description:
      "Used by thousands of universities worldwide. Turnitin's AI detection layer checks for low perplexity and uniform sentence structure. Our 3-stage pipeline introduces natural variance that defeats this.",
    category: "Academic",
    bypassRate: "~93%",
    color: "rose",
  },
  {
    name: "Originality.ai",
    url: "https://originality.ai",
    description:
      "A professional-grade detector used by publishers and content agencies. It combines AI detection with plagiarism checking. Our Pro model pipeline is tuned to score below its detection threshold.",
    category: "Professional",
    bypassRate: "~94%",
    color: "amber",
  },
  {
    name: "Copyleaks",
    url: "https://copyleaks.com",
    description:
      "Widely deployed in enterprise and education. Copyleaks uses a multi-model ensemble. Our humanizer's burstiness rules and sentence fragmentation techniques are effective against ensemble detectors.",
    category: "Enterprise",
    bypassRate: "~91%",
    color: "emerald",
  },
  {
    name: "Winston AI",
    url: "https://gowinston.ai",
    description:
      "A popular detector for content marketers and SEO agencies. Winston AI focuses on predictability and repetitive phrasing. Our tone-aware rewriting eliminates these patterns.",
    category: "Marketing",
    bypassRate: "~95%",
    color: "sky",
  },
  {
    name: "Sapling AI",
    url: "https://sapling.ai",
    description:
      "Used in customer support and content workflows. Sapling's detector is sensitive to formal transitional phrases. Our humanizer explicitly removes these AI fingerprints.",
    category: "Professional",
    bypassRate: "~94%",
    color: "violet",
  },
  {
    name: "ZeroGPT",
    url: "https://zerogpt.com",
    description:
      "A free, widely used detector popular among students and educators. ZeroGPT is effective against unmodified AI output but struggles with text that has been properly humanized.",
    category: "Academic",
    bypassRate: "~97%",
    color: "slate",
  },
  {
    name: "QuillBot",
    url: "https://quillbot.com",
    description:
      "QuillBot's AI detector is built into its paraphrasing platform and is widely used by educators to check student submissions. It is particularly sensitive to text that has been paraphrased by AI tools. Our humanizer introduces the natural imperfections and sentence-level variance that QuillBot's detector cannot flag.",
    category: "Academic",
    bypassRate: "~92%",
    color: "teal",
  },
  {
    name: "Content at Scale",
    url: "https://contentatscale.ai",
    description:
      "Designed for SEO content teams. It checks for predictability at the token level. Our high-temperature polish stage introduces the unpredictability needed to pass this detector.",
    category: "Marketing",
    bypassRate: "~94%",
    color: "orange",
  },
];

const colorMap: Record<string, string> = {
  indigo:  "bg-indigo-600",
  rose:    "bg-rose-600",
  amber:   "bg-amber-500",
  emerald: "bg-emerald-600",
  sky:     "bg-sky-600",
  violet:  "bg-violet-600",
  slate:   "bg-slate-600",
  orange:  "bg-orange-500",
  teal:    "bg-teal-600",
};

const categoryColors: Record<string, string> = {
  Academic:     "bg-indigo-50 text-indigo-700 border-indigo-200",
  Professional: "bg-violet-50 text-violet-700 border-violet-200",
  Enterprise:   "bg-slate-100 text-slate-700 border-slate-200",
  Marketing:    "bg-amber-50 text-amber-700 border-amber-200",
};

export default function DetectorsPage() {
  return (
    <>
      <StructuredData
        data={buildBreadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Detectors", path: "/detectors" },
        ])}
      />

      <div className="mx-auto max-w-6xl px-4 py-14">
        {/* Header */}
        <header className="mb-14 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 shadow-lg shadow-indigo-200">
            <ShieldCheck className="h-7 w-7 text-white" />
          </div>
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-indigo-600">
            Bypass Support
          </p>
          <h1 className="mt-3 text-4xl font-extrabold tracking-tight text-slate-900 md:text-5xl">
            Detectors we help you pass
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-lg text-slate-600">
            Our humanizer is engineered against the most widely deployed AI detectors.
            Here&apos;s exactly how we defeat each one.
          </p>

          {/* Quick stats */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-6 text-sm">
            {[
              { label: "Detectors supported", value: `${detectors.length}+` },
              { label: "Bypass rate (Pro)", value: "~94%" },
              { label: "Avg processing time", value: "< 15s" },
            ].map((s) => (
              <div key={s.label} className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 shadow-sm">
                <span className="font-bold text-slate-900">{s.value}</span>
                <span className="text-slate-500">{s.label}</span>
              </div>
            ))}
          </div>
        </header>

        {/* Detector grid */}
        <div className="grid gap-6 md:grid-cols-2">
          {detectors.map((detector) => {
            const catColor = categoryColors[detector.category] ?? "bg-slate-100 text-slate-700 border-slate-200";
            const dotColor = colorMap[detector.color] ?? "bg-slate-600";

            return (
              <article
                key={detector.name}
                className="group flex flex-col rounded-3xl border border-slate-200 bg-white p-7 shadow-sm transition-shadow hover:shadow-md"
              >
                {/* Card header */}
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${dotColor} text-sm font-bold text-white shadow-sm`}>
                      {detector.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-slate-900">{detector.name}</h2>
                      <div className="mt-1 flex items-center gap-2">
                        <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${catColor}`}>
                          {detector.category}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Bypass rate badge */}
                  <span className="shrink-0 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold text-emerald-700">
                    {detector.bypassRate} bypass
                  </span>
                </div>

                {/* Description */}
                <p className="mt-4 flex-1 text-sm leading-7 text-slate-600">
                  {detector.description}
                </p>

                {/* Footer */}
                <div className="mt-5 flex items-center justify-between border-t border-slate-100 pt-4">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
                    <CheckCircle2 className="h-4 w-4" />
                    Bypass supported
                  </div>
                  <a
                    href={detector.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-medium text-slate-400 transition hover:text-slate-600"
                  >
                    Visit site ↗
                  </a>
                </div>
              </article>
            );
          })}
        </div>

        {/* Disclaimer */}
        <div className="mt-12 rounded-2xl border border-slate-200 bg-slate-50 px-6 py-5">
          <p className="text-sm leading-7 text-slate-600">
            <strong>Note:</strong> Bypass rates are approximate and based on internal testing with Pro plan humanization.
            Results vary by text length, original content, and the selected plan. Free plan users may see lower bypass rates.
            Always review humanized output before submission.
          </p>
        </div>

        {/* CTA */}
        <div className="mt-14 rounded-3xl bg-gradient-to-br from-indigo-600 to-sky-500 px-8 py-12 text-center shadow-xl shadow-indigo-200">
          <h2 className="text-2xl font-extrabold text-white">
            Ready to bypass AI detectors?
          </h2>
          <p className="mt-3 text-indigo-100">
            Start free — no credit card required.
          </p>
          <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/auth/signup"
              className="inline-flex items-center gap-2 rounded-2xl bg-white px-7 py-3.5 text-sm font-bold text-indigo-700 shadow-lg transition hover:bg-indigo-50"
            >
              Get started free <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/pricing"
              className="inline-flex items-center gap-2 rounded-2xl border border-white/30 px-7 py-3.5 text-sm font-semibold text-white transition hover:bg-white/10"
            >
              View pricing
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
