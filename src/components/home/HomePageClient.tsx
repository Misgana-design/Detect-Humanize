"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowRight, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight,
  FileText, Lock, ShieldCheck, Sparkles, Star,
  Upload, Users, Zap, Quote,
} from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/Button";
import { HumanizerWorkspace } from "@/components/humanize/HumanizerPageClient";
import { siteConfig, testimonials, trustedByLogos } from "@/lib/site";

const steps = [
  { n: "1", title: "Paste or upload", desc: "Drop in a draft or import a document in seconds." },
  { n: "2", title: "Humanize instantly", desc: "Rewrite AI-heavy phrasing with natural rhythm, tone, and variation." },
  { n: "3", title: "Refine and export", desc: "Save reports, compare versions, and keep your workflow moving." },
];

const homeFaqEntries = [
  { question: "Will the humanized text pass GPTZero and Turnitin?", answer: "Our 3-stage humanizer is specifically engineered to maximize burstiness and perplexity  the two metrics AI detectors rely on. Pro and above plans use our full pipeline which has been tested against GPTZero, Originality.ai, and Turnitin. Results vary by text length and original content." },
  { question: "What file types can I upload?", answer: "TXT, MD, RTF, DOCX, and PDF files up to 10MB are supported. Text is extracted automatically and pre-filled into the editor." },
  { question: "Is my text stored or shared?", answer: "Your documents are stored in your private account and are never shared or used to train AI models. You can delete any document from your history at any time." },
  { question: "Can I try it for free?", answer: "Yes. The free plan gives you 1,000 words per month with humanization included. No credit card required." },
];

const stats = [
  { value: "400k+", label: "Active users", icon: <Users className="h-5 w-5" /> },
  { value: "3-stage", label: "Humanizer pipeline", icon: <Sparkles className="h-5 w-5" /> },
  { value: "4.9 / 5", label: "Average rating", icon: <Star className="h-5 w-5 fill-current" /> },
  { value: "< 10s", label: "Average analysis time", icon: <Zap className="h-5 w-5" /> },
];

const SIMULATION_PAIRS = [
  {
    label: "Academic Essay",
    ai: "Furthermore, it is important to note that climate change represents one of the most significant challenges facing humanity in the contemporary era. Moreover, the scientific consensus indicates that immediate action is required to mitigate its effects.",
    human: "Climate change is arguably the defining challenge of our time. Scientists agree we need to act now  and the window for meaningful action is narrowing faster than most people realize.",
  },
  {
    label: "Blog Post",
    ai: "In conclusion, artificial intelligence has the potential to transform numerous industries. It is worth noting that organizations that fail to adopt AI technologies may find themselves at a competitive disadvantage in the near future.",
    human: "AI is reshaping entire industries  and companies that ignore it risk falling behind. The gap between early adopters and laggards is already widening, and it will only get harder to close.",
  },
  {
    label: "Marketing Copy",
    ai: "Our product offers a comprehensive solution that addresses the needs of modern businesses. Additionally, our platform provides users with a seamless experience that enhances productivity and efficiency.",
    human: "We built this for teams that are tired of juggling five tools to do one job. Everything you need is in one place  and it actually works the way you expect it to.",
  },
];

const CATEGORY_COLORS: Record<string, string> = {
  Academic:   "bg-indigo-100 text-indigo-700",
  SEO:        "bg-amber-100 text-amber-700",
  Agency:     "bg-violet-100 text-violet-700",
  Education:  "bg-sky-100 text-sky-700",
  Freelance:  "bg-rose-100 text-rose-700",
  Marketing:  "bg-emerald-100 text-emerald-700",
  Business:   "bg-slate-100 text-slate-700",
};

function HomeFaqItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-slate-100 last:border-0">
      <button onClick={() => setOpen((o) => !o)} className="flex w-full items-center justify-between gap-4 py-5 text-left hover:cursor-pointer" aria-expanded={open}>
        <span className="text-base font-semibold text-slate-900">{question}</span>
        <ChevronDown className={`h-5 w-5 shrink-0 text-slate-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>
      {open && <p className="pb-5 text-sm leading-7 text-slate-600">{answer}</p>}
    </div>
  );
}

function FeatureCard({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <article className="group rounded-3xl border border-slate-100 bg-slate-50 p-8 transition-all hover:bg-white hover:shadow-xl hover:shadow-indigo-500/5">
      <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-white shadow-sm transition-transform group-hover:scale-110">{icon}</div>
      <h3 className="mb-3 text-xl font-bold text-slate-900">{title}</h3>
      <p className="leading-relaxed text-slate-600">{desc}</p>
    </article>
  );
}

//  Humanizer Simulation 

function HumanizerSimulation() {
  const [activeIdx, setActiveIdx] = useState(0);
  const [showHuman, setShowHuman] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);
  const pair = SIMULATION_PAIRS[activeIdx];

  const handleReveal = () => {
    if (isAnimating) return;
    setIsAnimating(true);
    setShowHuman(true);
    setTimeout(() => setIsAnimating(false), 600);
  };

  const handleSwitch = (idx: number) => {
    setActiveIdx(idx);
    setShowHuman(false);
  };

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-lg shadow-slate-100">
      {/* Header */}
      <div className="border-b border-slate-100 bg-linear-to-r from-indigo-600 to-sky-500 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles size={16} className="text-white" />
            <span className="text-sm font-bold text-white">
              Live Humanizer Demo
            </span>
          </div>
          <div className="flex gap-1.5">
            {SIMULATION_PAIRS.map((p, i) => (
              <button
                key={p.label}
                onClick={() => handleSwitch(i)}
                className={`rounded-full px-3 py-1 text-[11px] font-bold transition hover:cursor-pointer ${
                  i === activeIdx
                    ? "bg-white text-indigo-700"
                    : "bg-white/20 text-white hover:bg-white/30"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="grid divide-y divide-slate-100 md:grid-cols-2 md:divide-x md:divide-y-0">
        {/* AI text */}
        <div className="p-5">
          <div className="mb-3 flex items-center gap-2">
            <span className="rounded-full bg-red-100 px-2.5 py-0.5 text-[11px] font-bold text-red-600">
              AI-Generated
            </span>
            <span className="text-[11px] text-slate-400">
              ~87% AI probability
            </span>
          </div>
          <p className="text-sm leading-7 text-slate-600">{pair.ai}</p>
        </div>

        {/* Humanized text */}
        <div className="relative p-5">
          <div className="mb-3 flex items-center gap-2">
            <span className="rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700">
              Humanized
            </span>
            <span className="text-[11px] text-slate-400">
              ~4% AI probability
            </span>
          </div>

          {showHuman ? (
            <AnimatePresence>
              <motion.p
                key={activeIdx + "-human"}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="text-sm leading-7 text-slate-800"
              >
                {pair.human}
              </motion.p>
            </AnimatePresence>
          ) : (
            <div className="flex flex-col items-center justify-center gap-3 py-4">
              <div className="space-y-2 w-full">
                {[...Array(3)].map((_, i) => (
                  <div
                    key={i}
                    className={`h-3 rounded-full bg-slate-100 ${i === 2 ? "w-2/3" : "w-full"}`}
                  />
                ))}
              </div>
              <button
                onClick={handleReveal}
                className="mt-2 inline-flex cursor-pointer items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-indigo-100 transition hover:bg-indigo-700"
              >
                <Sparkles size={14} /> Humanize this text
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="border-t border-slate-100 bg-slate-50 px-6 py-3">
        <p className="text-center text-xs text-slate-400">
          This is a static preview.{" "}
          <Link
            href="#humanizer"
            className="font-semibold text-indigo-600 hover:underline"
          >
            Try the humanizer
          </Link>
        </p>
      </div>
    </div>
  );
}

//  Testimonials carousel 

function TestimonialsSection() {
  const [activeCategory, setActiveCategory] = useState("All");
  const [page, setPage] = useState(0);
  const CARDS_PER_PAGE = 3;

  const categories = ["All", ...Array.from(new Set(testimonials.map((t) => t.category)))];
  const filtered = activeCategory === "All" ? testimonials : testimonials.filter((t) => t.category === activeCategory);
  const totalPages = Math.ceil(filtered.length / CARDS_PER_PAGE);
  const visible = filtered.slice(page * CARDS_PER_PAGE, page * CARDS_PER_PAGE + CARDS_PER_PAGE);

  const handleCategory = (cat: string) => { setActiveCategory(cat); setPage(0); };

  return (
    <section className="py-20 bg-linear-to-b from-slate-50 to-white">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="mb-10 text-center">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-indigo-600">
            Testimonials
          </p>
          <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
            Trusted by writers, students, and professionals
          </h2>
          <p className="mt-3 text-base text-slate-500">
            From PhD candidates to content agencies here is what our users say.
          </p>
        </div>

        {/* Category filter */}
        <div className="mb-8 flex flex-wrap items-center justify-center gap-2">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => handleCategory(cat)}
              className={`rounded-full px-4 py-1.5 text-sm font-semibold transition hover:cursor-pointer ${
                activeCategory === cat
                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-100"
                  : "border border-slate-200 bg-white text-slate-600 hover:border-indigo-200 hover:text-indigo-600"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Cards */}
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence mode="wait">
            {visible.map((t, i) => {
              const catColor =
                CATEGORY_COLORS[t.category] ??
                "bg-slate-100 text-slate-600";
              return (
                <motion.article
                  key={t.name + activeCategory + page}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ delay: i * 0.07, duration: 0.4 }}
                  className="group relative flex flex-col rounded-3xl border border-slate-200 bg-white p-7 shadow-sm transition hover:shadow-md hover:border-indigo-100"
                >
                  {/* Quote icon */}
                  <Quote size={28} className="mb-3 text-indigo-100" />

                  {/* Stars */}
                  <div className="flex gap-0.5 text-amber-400">
                    {Array.from({ length: t.rating }).map((_, i) => (
                      <Star key={i} className="h-4 w-4 fill-current" />
                    ))}
                  </div>

                  {/* Quote */}
                  <p className="mt-3 flex-1 text-sm leading-7 text-slate-700">
                    &ldquo;{t.quote}&rdquo;
                  </p>

                  {/* Author */}
                  <div className="mt-5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
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
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${catColor}`}
                    >
                      {t.category}
                    </span>
                  </div>
                </motion.article>
              );
            })}
          </AnimatePresence>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-8 flex items-center justify-center gap-3">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:border-indigo-300 hover:text-indigo-600 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft size={16} />
            </button>
            {Array.from({ length: totalPages }).map((_, i) => (
              <button
                key={i}
                onClick={() => setPage(i)}
                className={`h-2.5 w-2.5 cursor-pointer rounded-full transition ${i === page ? "bg-indigo-600 w-6" : "bg-slate-300 hover:bg-slate-400"}`}
              />
            ))}
            <button
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page === totalPages - 1}
              className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:border-indigo-300 hover:text-indigo-600 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>
    </section>
  );
}

//  Main component 

export function HomePageClient() {
  return (
    <div className="relative overflow-hidden bg-slate-50">
      <div className="pointer-events-none absolute left-1/2 top-0 -z-10 h-176 w-full -translate-x-1/2 bg-[radial-gradient(circle_at_top,rgba(99,102,241,0.18),transparent_40%),linear-gradient(to_bottom,rgba(248,250,252,1),rgba(238,242,255,1))]" />

      {/* Announcement bar */}
      <div className="border-b border-indigo-100 bg-indigo-50 py-2.5 text-center text-xs font-medium text-indigo-700">
        Humanize AI-assisted drafts for GPTZero, Originality.ai, Turnitin, and
        more.
      </div>

      {/* Hero */}
      <section className="pb-16 pt-16">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-4xl text-center">
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
                <strong className="text-slate-900">400k</strong> writers,
                students & professionals
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
              Humanize AI text.{" "}
              <span className="relative">
                <span className="relative z-10 animate-pulse text-indigo-600">
                  Rewrite it
                </span>
                <span className="absolute -bottom-1 left-0 right-0 h-3 -rotate-1 rounded bg-indigo-100" />
              </span>{" "}
              naturally.
            </h1>

            <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-slate-600">
              A focused workspace for students, researchers, SEO writers, and
              content teams who need AI-assisted drafts to sound natural,
              polished, and publication-ready.
            </p>

            <ul className="mx-auto mt-6 grid max-w-2xl gap-2 text-left sm:grid-cols-3">
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

            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <a href="#humanizer">
                <Button size="lg" className="gap-2 hover:cursor-pointer">
                  Start humanizing <ArrowRight className="h-4 w-4" />
                </Button>
              </a>
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

            <p className="mt-4 flex items-center justify-center gap-1.5 text-xs text-slate-400">
              <Lock className="h-3.5 w-3.5" />
              Your text is private and never used to train AI models.
            </p>
          </div>
        </div>
      </section>

      {/* Dedicated Humanizer */}
      <section
        id="humanizer"
        className="relative overflow-hidden border-y border-indigo-100 bg-[linear-gradient(135deg,#f8fafc_0%,#eef2ff_42%,#f0fdfa_100%)] py-20"
      >
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_right,rgba(99,102,241,0.08)_1px,transparent_1px),linear-gradient(to_bottom,rgba(20,184,166,0.08)_1px,transparent_1px)] bg-size-[44px_44px]" />
        <motion.div
          initial={{ opacity: 0, y: 22 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.08 }}
          transition={{ duration: 0.55, ease: "easeOut" }}
          className="container relative mx-auto px-4"
        >
          <HumanizerWorkspace variant="home" />
        </motion.div>
      </section>

      {/* Stats bar */}
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

      {/* How it works */}
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

      {/* Humanizer Simulation */}
      <section className="bg-linear-to-b from-indigo-50/50 to-white py-20">
        <div className="container mx-auto px-4">
          <div className="mx-auto mb-10 max-w-2xl text-center">
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-indigo-600">
              See it in action
            </p>
            <h2 className="mt-3 text-3xl font-bold tracking-tight text-slate-900">
              AI text vs humanized text
            </h2>
            <p className="mt-3 text-base text-slate-500">
              Click the button to see exactly what our humanizer does to
              AI-generated content.
            </p>
          </div>
          <div className="mx-auto max-w-4xl">
            <HumanizerSimulation />
          </div>
        </div>
      </section>

      {/* Features */}
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
                title: "Natural Rewrite",
                desc: "Rebuild stiff AI phrasing into smoother, more varied writing while preserving your original meaning.",
              },
              {
                icon: <Sparkles className="text-emerald-600" />,
                title: "3-Stage Humanizer",
                desc: "Analysis  Rewrite  Polish pipeline destroys the AI fingerprint by maximizing burstiness and perplexity.",
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
                desc: "Every rewrite is saved. Compare original vs humanized text side-by-side and re-humanize any document.",
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

      {/* Trusted By */}
      <section className="overflow-hidden border-y border-slate-200 bg-white py-14">
        <div className="container mx-auto px-4">
          <p className="mb-8 text-center text-sm font-bold uppercase tracking-[0.2em] text-slate-400">
            Trusted by students and researchers from
          </p>
          <div className="group relative overflow-hidden">
            <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-20 bg-linear-to-r from-white to-transparent" />
            <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-20 bg-linear-to-l from-white to-transparent" />
            <div className="marquee flex items-center gap-10 py-3 group-hover:[animation-play-state:paused]">
              {[...trustedByLogos, ...trustedByLogos].map((logo, index) => (
                <div
                  key={`${logo.name}-${index}`}
                  className="flex shrink-0 items-center justify-center opacity-50 grayscale transition-all duration-300 hover:opacity-100 hover:grayscale-0"
                  style={{ minWidth: "120px" }}
                >
                  <Image
                    src={logo.src}
                    alt={logo.name}
                    width={120}
                    height={48}
                    className="h-10 w-auto object-contain"
                    unoptimized
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <TestimonialsSection />

      {/* FAQ */}
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

      {/* Final CTA */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="relative overflow-hidden rounded-3xl bg-linear-to-br from-indigo-600 via-indigo-500 to-sky-500 px-8 py-16 text-center shadow-2xl shadow-indigo-200">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.15),transparent_50%)]" />
            <p className="text-sm font-bold uppercase tracking-[0.2em] text-indigo-200">
              Get started today
            </p>
            <h2 className="mt-3 text-3xl font-extrabold text-white md:text-4xl">
              Submit with confidence.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-base text-indigo-100">
              Join 400k students, researchers, writers, and content teams who
              use Text Humanica to rewrite, polish, and publish without
              second-guessing their work.
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
              Free plan available No credit card required Cancel anytime
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
