"use client";

import { Button } from "@/components/ui/Button";
import { ArrowRight, CheckCircle2, ShieldCheck, Zap } from "lucide-react";
import { motion } from "framer-motion";
import Link from "next/link";

const steps = [
  { n: "1", title: "Paste or upload", desc: "Add your text or upload a file" },
  {
    n: "2",
    title: "Analyze",
    desc: "Get instant AI detection or humanization",
  },
  {
    n: "3",
    title: "Export",
    desc: "Save, share, or integrate with your workflow",
  },
];

export default function LandingPage() {
  return (
    <div className="relative overflow-hidden bg-slate-50">
      {/* Background Gradient Blur */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-150 bg-[radial-gradient(circle_at_center,var(--tw-gradient-stops))] from-indigo-100/40 via-transparent to-transparent -z-10" />

      <section className="pt-24 pb-16 text-center">
        <div className="container px-4 mx-auto">
          <span className="inline-block px-4 py-1.5 mb-6 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-full border border-indigo-100">
            Now Powered by GPT-4o 🚀
          </span>
          <h1 className="text-5xl md:text-7xl font-bold tracking-tight text-slate-900 mb-6">
            Make AI Content <br />
            <span className="bg-linear-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              Indistinguishable
            </span>
          </h1>
          <p className="max-w-2xl mx-auto text-lg text-slate-600 mb-10">
            The world's most advanced AI detector and humanizer. Ensure your
            content bypasses AI detection with 99.9% accuracy.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Button size="lg" className="w-full sm:w-auto">
              Get Started Free <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
            <Button variant="secondary" size="lg" className="w-full sm:w-auto">
              View Pricing
            </Button>
          </div>
        </div>
      </section>

      {/* Feature Section */}
      <section className="py-20 bg-white">
        <div className="container px-4 mx-auto">
          <div className="grid md:grid-cols-3 gap-8">
            <FeatureCard
              icon={<ShieldCheck className="text-indigo-600" />}
              title="Advanced Detection"
              desc="Multi-layer analysis that identifies AI patterns across all major LLMs."
            />
            <FeatureCard
              icon={<Zap className="text-purple-600" />}
              title="Instant Humanizer"
              desc="Rewrite text to flow naturally while maintaining original intent and meaning."
            />
            <FeatureCard
              icon={<CheckCircle2 className="text-emerald-600" />}
              title="Plagiarism Free"
              desc="Every output is 100% unique and optimized for SEO and readability."
            />
          </div>
        </div>
      </section>

      <section className="section-padding py-20">
        <div className="mx-auto max-w-7xl px-6">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="mx-auto max-w-2xl text-center"
          >
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
              How it works
            </h2>
            <p className="mt-4 text-base text-slate-600">
              Three simple steps to trust your content.
            </p>
          </motion.div>
          <div className="mt-16 grid gap-12 sm:grid-cols-3 sm:gap-8">
            {steps.map((s, i) => (
              <motion.div
                key={s.n}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.08 }}
                className="relative flex flex-col items-center text-center sm:items-start sm:text-left"
              >
                <span className="flex h-10 w-10 items-center justify-center rounded-full border border-slate-200 bg-white text-sm font-semibold text-slate-700 shadow-xs">
                  {s.n}
                </span>
                <h3 className="mt-4 font-semibold text-slate-900">{s.title}</h3>
                <p className="mt-2 text-sm text-slate-500">{s.desc}</p>
                {i < steps.length - 1 && (
                  <div className="absolute top-5 left-[calc(50%+20px)] hidden h-px w-[calc(100%-40px)] bg-slate-200 sm:left-full sm:top-5 sm:block sm:h-auto sm:w-8 sm:bg-none" />
                )}
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      <section className="section-padding">
        <div className="mx-auto max-w-7xl px-6">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="relative overflow-hidden rounded-3xl border border-slate-200/80 bg-slate-100 p-12 shadow-card md:p-16 glow-subtle"
          >
            <div
              className="absolute right-0 top-0 h-64 w-64 translate-x-1/2 -translate-y-1/2 rounded-full bg-primary-500/10 blur-3xl animate-pulse"
              aria-hidden
            />
            <div className="relative mx-auto max-w-2xl text-center">
              <h2 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
                Simple pricing
              </h2>
              <p className="mt-4 text-base text-slate-600">
                Start free. Scale as you grow. No hidden fees.
              </p>
              <div className="mt-8">
                <Link href="/pricing">
                  <Button variant="primary" size="lg">
                    View plans
                  </Button>
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </section>
    </div>
  );
}

function FeatureCard({ icon, title, desc }: any) {
  return (
    <div className="p-8 border border-slate-100 rounded-2xl bg-slate-50 hover:bg-white hover:shadow-xl hover:shadow-indigo-500/5 transition-all group">
      <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
        {icon}
      </div>
      <h3 className="text-xl font-bold mb-3">{title}</h3>
      <p className="text-slate-600 leading-relaxed">{desc}</p>
    </div>
  );
}
