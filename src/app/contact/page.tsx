import type { Metadata } from "next";
import { StructuredData } from "@/components/seo/StructuredData";
import { buildBreadcrumbJsonLd, buildMetadata } from "@/lib/seo";
import { ContactForm } from "@/components/contact/ContactForm";
import { Clock, Mail, MessageSquare, Zap } from "lucide-react";

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({
    title: "Contact Support",
    description:
      "Contact Text Humanica for AI detector support, AI humanizer questions, billing help, Ultra plans, API access, or GPTZero bypass workflow guidance.",
    path: "/contact",
    keywords: [
      "Text Humanica support",
      "AI humanizer support",
      "AI detector support",
      "Ultra AI writing API",
    ],
  });
}

const supportTopics = [
  {
    icon: <Zap className="h-5 w-5 text-indigo-400" />,
    title: "Detection & Humanization",
    desc: "Questions about accuracy, bypass rates, or how the AI pipeline works.",
  },
  {
    icon: <MessageSquare className="h-5 w-5 text-emerald-400" />,
    title: "Billing & Subscriptions",
    desc: "Plan upgrades, cancellations, invoices, or payment issues.",
  },
  {
    icon: <Mail className="h-5 w-5 text-amber-400" />,
    title: "Account & Access",
    desc: "Login problems, password resets, or account data requests.",
  },
  {
    icon: <Clock className="h-5 w-5 text-sky-400" />,
    title: "Partnerships & API",
    desc: "Bulk processing, API access, or integration inquiries.",
  },
];

export default function ContactPage() {
  return (
    <section className="mx-auto max-w-6xl px-4 py-14">
      <StructuredData
        data={buildBreadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Contact", path: "/contact" },
        ])}
      />
      <div className="grid gap-8 lg:grid-cols-[1fr_1.1fr]">
        {/* Left — info panel */}
        <div className="rounded-3xl border border-indigo-100 bg-gradient-to-br from-indigo-600 via-indigo-500 to-sky-500 p-8 text-white shadow-2xl shadow-indigo-200">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-indigo-200">
            Support
          </p>
          <h1 className="mt-3 text-4xl font-extrabold tracking-tight">
            We&apos;re here to help
          </h1>
          <p className="mt-4 leading-7 text-indigo-100">
            Whether you have a question about detection accuracy, need help with
            your subscription, or want to explore a partnership — send us a
            message and we&apos;ll get back to you promptly.
          </p>

          {/* Response time */}
          <div className="mt-8 rounded-2xl bg-white/10 p-5">
            <div className="flex items-center gap-2 text-sm font-bold text-white">
              <Clock className="h-4 w-4" />
              Response times
            </div>
            <ul className="mt-3 space-y-2 text-sm text-indigo-100">
              <li className="flex items-center justify-between">
                <span>Pro & above plans</span>
                <span className="font-semibold text-white">Within 4 hours</span>
              </li>
              <li className="flex items-center justify-between">
                <span>Basic plan</span>
                <span className="font-semibold text-white">Within 24 hours</span>
              </li>
              <li className="flex items-center justify-between">
                <span>Free plan</span>
                <span className="font-semibold text-white">Within 48 hours</span>
              </li>
            </ul>
          </div>

          {/* Support hours */}
          <div className="mt-5 rounded-2xl bg-white/10 p-5">
            <div className="flex items-center gap-2 text-sm font-bold text-white">
              <Mail className="h-4 w-4" />
              Support hours
            </div>
            <p className="mt-2 text-sm text-indigo-100">
              Monday – Friday, 9 AM – 6 PM UTC.
              <br />
              We monitor critical issues on weekends.
            </p>
            <p className="mt-3 text-sm font-semibold text-white">
              support@texthumanica.com
            </p>
          </div>

          {/* Common topics */}
          <div className="mt-6">
            <p className="mb-3 text-xs font-bold uppercase tracking-widest text-indigo-200">
              Common topics
            </p>
            <div className="grid grid-cols-2 gap-2">
              {supportTopics.map((topic) => (
                <div
                  key={topic.title}
                  className="rounded-xl bg-white/10 p-3"
                >
                  <div className="mb-1 flex items-center gap-1.5">
                    {topic.icon}
                    <span className="text-xs font-bold text-white">{topic.title}</span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-indigo-200">{topic.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Right — form */}
        <ContactForm />
      </div>
    </section>
  );
}
