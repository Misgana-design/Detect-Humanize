"use client";

import { useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  FileText,
  Lock,
  ScanText,
  ShieldCheck,
  Sparkles,
  Star,
  TrendingUp,
  Upload,
  Users,
  Zap,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { TextUploadField } from "@/components/forms/TextUploadField";
import { siteConfig, testimonials, trustedByLogos } from "@/lib/site";

// ── Data ────────────────────────────────────────────────────────────────────

const steps = [
  {
    n: "1",
    title: "Paste or upload",
    desc: "Drop in a draft or import a document in seconds.",
  },
  {
    n: "2",
    title: "Choose your tool",
    desc: "Run the AI detector or humanize directly — your call.",
  },
  {
    n: "3",
    title: "Refine and export",
    desc: "Save reports, compare versions, and keep your workflow moving.",
  },
];

const homeFaqEntries = [
  {
    question: "How accurate is the AI detector?",
    answer:
      "Our detector uses Humanica Pro model with a multi-chunk linguistic forensic analysis. It scores text on burstiness, perplexity, and sentence rhythm — the same signals GPTZero and Originality.ai use. Paid plans use the Pro model for deeper analysis.",
  },
  // {
  //   question: "Will the humanized text pass GPTZero and Turnitin?",
  //   answer:
  //     "Our 3-stage humanizer is specifically engineered to maximize burstiness and perplexity — the two metrics AI detectors rely on. Pro and above plans use our full pipeline which has been tested against GPTZero, Originality.ai, and Turnitin. Results vary by text length and original content.",
  // },
  {
    question: "What file types can I upload?",
    answer:
      "TXT, MD, RTF, DOCX, and PDF files up to 10MB are supported. Text is extracted automatically and pre-filled into the editor.",
  },
  {
    question: "Is my text stored or shared?",
    answer:
      "Your documents are stored in your private account and are never shared or used to train AI models. You can delete any document from your history at any time.",
  },
  {
    question: "Can I try it for free?",
    answer:
      "Yes. The free plan gives you 1,000 words per month with basic detection and humanization. No credit card required.",
  },
];

const stats = [
  {
    value: "400k+",
    label: "Active users",
    icon: <Users className="h-5 w-5" />,
  },
  {
    value: "98.2%",
    label: "Detection accuracy",
    icon: <TrendingUp className="h-5 w-5" />,
  },
  {
    value: "4.9 / 5",
    label: "Average rating",
    icon: <Star className="h-5 w-5 fill-current" />,
  },
  {
    value: "< 10s",
    label: "Average analysis time",
    icon: <Zap className="h-5 w-5" />,
  },
];

// ── Micro-components ─────────────────────────────────────────────────────────

function HomeFaqItem({
  question,
  answer,
}: {
  question: string;
  answer: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-slate-100 last:border-0">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-4 py-5 text-left hover:cursor-pointer"
        aria-expanded={open}
      >
        <span className="text-base font-semibold text-slate-900">
          {question}
        </span>
        <ChevronDown
          className={`h-5 w-5 shrink-0 text-slate-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        />
      </button>
      {open && (
        <p className="pb-5 text-sm leading-7 text-slate-600">{answer}</p>
      )}
    </div>
  );
}

function FeatureCard({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <article className="group rounded-3xl border border-slate-100 bg-slate-50 p-8 transition-all hover:bg-white hover:shadow-xl hover:shadow-indigo-500/5">
      <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-white shadow-sm transition-transform group-hover:scale-110">
        {icon}
      </div>
      <h3 className="mb-3 text-xl font-bold text-slate-900">{title}</h3>
      <p className="leading-relaxed text-slate-600">{desc}</p>
    </article>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export function HomePageClient() {
  const router = useRouter();
  const [text, setText] = useState("");

  const goToDetector = () => {
    const trimmed = text.trim();
    if (trimmed) {
      try {
        sessionStorage.setItem("detector_prefill_text", trimmed);
      } catch {
        /* ignore */
      }
    }
    // Only put short texts in the URL; long texts come from sessionStorage
    const shortEnough = trimmed.length < 1500;
    const query =
      trimmed && shortEnough
        ? `?text=${encodeURIComponent(trimmed)}&fromHome=1`
        : trimmed
          ? "?fromHome=1"
          : "";
    router.push(`/detector${query}`);
  };

  const goToHumanizer = () => {
    const trimmed = text.trim();
    if (trimmed) {
      try {
        sessionStorage.setItem("humanize_prefill_text", trimmed);
      } catch {
        /* ignore */
      }
    }
    const shortEnough = trimmed.length < 1500;
    const query =
      trimmed && shortEnough
        ? `?text=${encodeURIComponent(trimmed)}&fromHome=1`
        : trimmed
          ? "?fromHome=1"
          : "";
    router.push(`/humanize${query}`);
  };

  return (
    <div className="relative overflow-hidden bg-slate-50">
      {/* Hero gradient */}
      <div className="pointer-events-none absolute left-1/2 top-0 -z-10 h-176 w-full -translate-x-1/2 bg-[radial-gradient(circle_at_top,rgba(99,102,241,0.18),transparent_40%),linear-gradient(to_bottom,rgba(248,250,252,1),rgba(238,242,255,1))]" />

      {/* ── Announcement bar ── */}
      {/* <div className="border-b border-indigo-100 bg-indigo-50 py-2.5 text-center text-xs font-medium text-indigo-700">
        🎉 Now bypassing GPTZero, Originality.ai, Turnitin, and more —{" "}
        <Link
          href="/detectors"
          className="underline underline-offset-2 hover:text-indigo-900"
        >
          see all supported detectors
        </Link>
      </div> */}

      {/* ── Hero ── */}
      <section className="pb-16 pt-16">
        <div className="container mx-auto grid items-start gap-14 px-4 lg:grid-cols-[1.15fr_0.85fr]">
          {/* Left copy */}
          <div>
            {/* Social proof pill */}
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-4 py-2 shadow-sm">
              <div className="flex -space-x-1.5">
                {["MT", "DB", "LA"].map((initials) => (
                  <div
                    key={initials}
                    className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-[9px] font-bold text-white ring-2 ring-white"
                  >
                    {initials}
                  </div>
                ))}
              </div>
              <span className="text-xs font-medium text-slate-600">
                <strong className="text-slate-900">400k</strong> students &
                researchers trust us
              </span>
              <div className="flex gap-0.5">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className="h-3 w-3 fill-amber-400 text-amber-400"
                  />
                ))}
              </div>
            </div>

            <h1 className="text-5xl font-extrabold tracking-tight text-slate-900 md:text-[4.5rem] md:leading-[1.08]">
              Detect AI text.{" "}
              <span className="relative">
                <span className="relative z-10 text-indigo-600 animate-pulse">
                  Rewrite it
                </span>
                <span className="absolute -bottom-1 left-0 right-0 h-3 -rotate-1 rounded bg-indigo-100" />
              </span>{" "}
              naturally.
            </h1>

            <p className="mt-6 max-w-xl text-lg leading-8 text-slate-600">
              One workspace for students, researchers, and writers who need to
              submit with confidence.
            </p>

            {/* Value props */}
            <ul className="mt-6 space-y-2">
              {[
                "No credit card required to start",
                "Results in under 10 seconds",
                "Supports TXT, DOCX, PDF uploads",
              ].map((item) => (
                <li
                  key={item}
                  className="flex items-center gap-2 text-sm text-slate-600"
                >
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
                  {item}
                </li>
              ))}
            </ul>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link href="/auth/signup">
                <Button size="lg" className="gap-2 hover:cursor-pointer">
                  Start for free <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
              <Link href={siteConfig.links.pricing}>
                <Button
                  variant="secondary"
                  size="lg"
                  className="hover:cursor-pointer"
                >
                  View pricing
                </Button>
              </Link>
            </div>

            {/* Trust micro-copy */}
            <p className="mt-4 flex items-center gap-1.5 text-xs text-slate-400">
              <Lock className="h-3.5 w-3.5" />
              Your text is private and never used to train AI models.
            </p>
          </div>

          {/* Right — interactive card */}
          <div className="rounded-4xl border border-white/70 bg-white/95 p-6 shadow-2xl shadow-indigo-100/60 backdrop-blur">
            {/* Card header */}
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-slate-900">
                  Try it now — free
                </p>
                <p className="text-xs text-slate-500">
                  Paste text or upload a file
                </p>
              </div>
              <div className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700">
                <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-500" />
                Live
              </div>
            </div>

            <TextUploadField
              value={text}
              onChange={setText}
              placeholder="Paste or drop your text here..."
              minHeightClassName="min-h-[240px]"
            />

            <div className="mt-4 grid grid-cols-2 gap-3">
              <button
                onClick={goToDetector}
                className="flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3.5 text-sm font-semibold text-slate-800 shadow-sm transition hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 hover:cursor-pointer"
              >
                <ScanText className="h-4 w-4" />
                AI Detector
              </button>
              <button
                onClick={goToHumanizer}
                className="flex items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-4 py-3.5 text-sm font-semibold text-white shadow-md shadow-indigo-100 transition hover:bg-indigo-700 hover:cursor-pointer"
              >
                <Sparkles className="h-4 w-4" />
                Humanizer
              </button>
            </div>

            <p className="mt-3 text-center text-xs text-slate-400">
              Text is optional — paste it on the next page too.
            </p>

            {/* Detector logos strip */}
            {/* <div className="mt-5 border-t border-slate-100 pt-4">
              <p className="mb-2.5 text-center text-[10px] font-bold uppercase tracking-widest text-slate-400">
                Bypasses
              </p>
              <div className="flex flex-wrap items-center justify-center gap-2">
                {[
                  "GPTZero",
                  "Turnitin",
                  "Originality.ai",
                  "Copyleaks",
                  "Winston AI",
                ].map((d) => (
                  <span
                    key={d}
                    className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-500"
                  >
                    {d}
                  </span>
                ))}
              </div>
            </div> */}
          </div>
        </div>
      </section>

      {/* ── Stats bar ── */}
      <section className="border-y border-slate-200 bg-white py-10">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 gap-6 md:grid-cols-4">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="flex flex-col items-center gap-1 text-center"
              >
                <div className="flex items-center gap-1.5 text-indigo-500">
                  {stat.icon}
                </div>
                <p className="text-2xl font-black text-slate-900">
                  {stat.value}
                </p>
                <p className="text-xs font-medium text-slate-500">
                  {stat.label}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-indigo-600">
              How it works
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
              From draft to submission-ready in 3 steps
            </h2>
          </div>
          <div className="mt-14 grid gap-8 sm:grid-cols-3">
            {steps.map((step, i) => (
              <motion.article
                key={step.n}
                initial={{ opacity: 0, y: 24 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.05 }}
                transition={{ delay: i * 0.12, duration: 0.5, ease: "easeOut" }}
                className="relative rounded-3xl border border-slate-200 bg-white p-7 shadow-sm"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-600 text-sm font-bold text-white shadow-md shadow-indigo-200">
                  {step.n}
                </span>
                <h3 className="mt-5 text-lg font-bold text-slate-900">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-7 text-slate-600">
                  {step.desc}
                </p>
                {i < steps.length - 1 && (
                  <ArrowRight className="absolute -right-4 top-1/2 hidden h-5 w-5 -translate-y-1/2 text-slate-300 sm:block" />
                )}
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="bg-slate-50 py-20">
        <div className="container mx-auto px-4">
          <div className="mx-auto mb-14 max-w-2xl text-center">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-indigo-600">
              Features
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
              Everything you need in one place
            </h2>
          </div>
          <div className="grid gap-6 md:grid-cols-3">
            {[
              {
                icon: <ShieldCheck className="text-indigo-600" />,
                title: "Advanced Detection",
                desc: "Multi-layer forensic analysis surfaces AI patterns, suspicious phrasing, and sentence-level flags with a probability score.",
              },
              {
                icon: <Sparkles className="text-emerald-600" />,
                title: "3-Stage Humanizer",
                desc: "Analysis → Rewrite → Polish pipeline destroys the AI fingerprint by maximizing burstiness and perplexity.",
              },
              {
                icon: <FileText className="text-amber-600" />,
                title: "File Upload Support",
                desc: "Drag and drop TXT, DOCX, PDF, MD, and RTF files up to 10MB. Text is extracted and pre-filled instantly.",
              },
              {
                icon: <Zap className="text-rose-600" />,
                title: "Priority Processing",
                desc: "Paid plans jump the queue. Your requests are processed with high priority so you never wait behind free users.",
              },
              {
                icon: <CheckCircle2 className="text-sky-600" />,
                title: "Export-Ready",
                desc: "Copy directly to Google Docs format or download a formatted PDF. Your work, your format.",
              },
              {
                icon: <Upload className="text-violet-600" />,
                title: "Full History",
                desc: "Every scan and rewrite is saved. Compare original vs humanized side-by-side and re-humanize any document.",
              },
            ].map((f, i) => (
              <motion.div
                key={f.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.05 }}
                transition={{
                  delay: i * 0.08,
                  duration: 0.45,
                  ease: "easeOut",
                }}
              >
                <FeatureCard icon={f.icon} title={f.title} desc={f.desc} />
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Trusted By ── */}
      <section className="overflow-hidden border-y border-slate-200 bg-white py-14">
        <div className="container mx-auto px-4">
          <p className="mb-8 text-center text-sm font-bold uppercase tracking-[0.2em] text-slate-400">
            Trusted by students and researchers from
          </p>
          <div className="group relative overflow-hidden">
            <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-20 bg-linear-to-r from-white to-transparent" />
            <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-20 bg-linear-to-l from-white to-transparent" />
            <div className="marquee flex gap-5 py-2 group-hover:[animation-play-state:paused]">
              {[...trustedByLogos, ...trustedByLogos].map((logo, index) => (
                <div
                  key={`${logo}-${index}`}
                  className="flex shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 px-6 py-3.5 text-sm font-semibold text-slate-500 opacity-60 grayscale transition-all duration-300 hover:opacity-100 hover:grayscale-0 hover:shadow-md"
                  style={{ minWidth: "190px" }}
                >
                  {logo}
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Testimonials ── */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="mb-12 text-center">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-indigo-600">
              Testimonials
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
              What people are saying
            </h2>
          </div>
          <div className="grid gap-6 lg:grid-cols-3">
            {testimonials.map((t, i) => (
              <motion.article
                key={t.name}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.05 }}
                transition={{ delay: i * 0.1, duration: 0.5, ease: "easeOut" }}
                className="rounded-3xl border border-slate-200 bg-white p-7 shadow-sm"
              >
                <div className="flex gap-0.5 text-amber-400">
                  {Array.from({ length: t.rating }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-current" />
                  ))}
                </div>
                <p className="mt-4 text-sm leading-7 text-slate-700">
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div className="mt-5 flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-linear-to-br from-indigo-100 to-emerald-100 text-sm font-bold text-slate-700">
                    {t.name
                      .split(" ")
                      .map((p) => p[0])
                      .join("")
                      .slice(0, 2)}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-slate-900">
                      {t.name}
                    </p>
                    <p className="text-xs text-slate-500">{t.title}</p>
                  </div>
                </div>
              </motion.article>
            ))}
          </div>
        </div>
      </section>

      {/* ── Homepage FAQ ── */}
      <section className="bg-white py-20">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-3xl">
            <div className="mb-10 text-center">
              <p className="text-sm font-bold uppercase tracking-[0.2em] text-indigo-600">
                FAQ
              </p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
                Common questions
              </h2>
              <p className="mt-3 text-base text-slate-500">
                Everything you need to know before you start.
              </p>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white px-8 shadow-sm">
              {homeFaqEntries.map((entry) => (
                <HomeFaqItem key={entry.question} {...entry} />
              ))}
            </div>

            <p className="mt-6 text-center text-sm text-slate-500">
              More questions?{" "}
              <Link
                href="/faq"
                className="font-semibold text-indigo-600 hover:underline"
              >
                See the full FAQ
              </Link>{" "}
              or{" "}
              <Link
                href="/contact"
                className="font-semibold text-indigo-600 hover:underline"
              >
                contact us
              </Link>
              .
            </p>
          </div>
        </div>
      </section>

      {/* ── Final CTA ── */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="relative overflow-hidden rounded-3xl bg-linear-to-br from-indigo-600 via-indigo-500 to-sky-500 px-8 py-16 text-center shadow-2xl shadow-indigo-200">
            {/* Background decoration */}
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.15),transparent_50%)]" />

            <p className="text-sm font-bold uppercase tracking-[0.2em] text-indigo-200">
              Get started today
            </p>
            <h2 className="mt-3 text-3xl font-extrabold text-white md:text-4xl">
              Submit with confidence.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base text-indigo-100">
              Join 400k students and researchers who use Text Humanica to
              detect, rewrite, and submit without second-guessing their work.
            </p>

            <div className="mt-8 flex flex-col items-center gap-3 sm:flex-row sm:justify-center">
              <Link
                href="/auth/signup"
                className="inline-flex items-center gap-2 rounded-2xl bg-white px-7 py-3.5 text-sm font-bold text-indigo-700 shadow-lg transition hover:bg-indigo-50"
              >
                Start for free <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                href={siteConfig.links.pricing}
                className="inline-flex items-center gap-2 rounded-2xl border border-white/30 px-7 py-3.5 text-sm font-semibold text-white transition hover:bg-white/10"
              >
                View pricing
              </Link>
            </div>

            <p className="mt-5 text-xs text-indigo-200">
              Free plan available · No credit card required · Cancel anytime
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
