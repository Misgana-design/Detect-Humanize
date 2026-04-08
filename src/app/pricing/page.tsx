"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { motion } from "framer-motion";

const plans = [
  {
    name: "Free",
    price: { monthly: 0, yearly: 0 },
    desc: "For casual use and trying out",
    features: ["500 words/month", "Basic detection", "Email support"],
    cta: "Get started",
    href: "/signup",
    featured: false,
  },
  {
    name: "Starter",
    price: { monthly: 19, yearly: 15 },
    desc: "For writers and students",
    features: [
      "10,000 words/month",
      "Detection + Humanizer",
      "Priority support",
      "Save reports",
    ],
    cta: "Start trial",
    href: "/signup",
    featured: false,
  },
  {
    name: "Pro",
    price: { monthly: 49, yearly: 39 },
    desc: "For teams and professionals",
    features: [
      "Unlimited words",
      "API access",
      "Team dashboard",
      "Export & integrations",
      "Dedicated support",
    ],
    cta: "Start trial",
    href: "/signup",
    featured: true,
  },
];

const comparisons = [
  { feature: "AI Detection", free: true, starter: true, pro: true },
  { feature: "Humanizer", free: false, starter: true, pro: true },
  { feature: "Save reports", free: false, starter: true, pro: true },
  { feature: "API access", free: false, starter: false, pro: true },
  { feature: "Team dashboard", free: false, starter: false, pro: true },
];

export default function PricingPage() {
  const [yearly, setYearly] = useState(false);

  return (
    <div className="min-h-screen gradient-bg">
      <main className="mx-auto max-w-7xl px-6 py-16 md:py-24">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-auto max-w-2xl text-center"
        >
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
            Simple, transparent pricing
          </h1>
          <p className="mt-4 text-base text-slate-600">
            Start free. Scale when you need to. No hidden fees.
          </p>

          <div className="mt-10 flex items-center justify-center gap-4">
            <span
              className={`text-sm font-medium ${!yearly ? "text-slate-900" : "text-slate-500"}`}
            >
              Monthly
            </span>
            <button
              role="switch"
              aria-checked={yearly}
              onClick={() => setYearly(!yearly)}
              className={`relative h-7 w-14 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 ${yearly ? "bg-blue-500" : "bg-slate-200"}`}
            >
              <span
                className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all duration-200 ${yearly ? "left-8" : "left-1"}`}
              />
            </button>
            <span
              className={`text-sm font-medium ${yearly ? "text-slate-900" : "text-slate-500"}`}
            >
              Yearly
            </span>
            <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-medium text-emerald-700">
              Save 20%
            </span>
          </div>
        </motion.div>

        <div className="mt-16 grid gap-6 lg:grid-cols-3 lg:gap-8">
          {plans.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              className={`relative rounded-2xl border bg-white p-8 shadow-card transition-all ${
                plan.featured
                  ? "border-slate-300 shadow-soft-lg ring-1 ring-slate-200/80"
                  : "border-slate-200/80"
              }`}
            >
              {plan.featured && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-slate-900 px-4 py-1.5 text-xs font-medium text-white">
                  Most popular
                </div>
              )}
              <h3 className="text-lg font-semibold text-slate-900">
                {plan.name}
              </h3>
              <p className="mt-2 text-sm text-slate-600">{plan.desc}</p>
              <div className="mt-6">
                <span className="text-3xl font-semibold tabular-nums text-slate-900">
                  ${yearly ? plan.price.yearly : plan.price.monthly}
                </span>
                {plan.price.monthly > 0 && (
                  <span className="text-slate-500">/mo</span>
                )}
              </div>
              <ul className="mt-6 space-y-3">
                {plan.features.map((f) => (
                  <li
                    key={f}
                    className="flex items-center gap-2.5 text-sm text-slate-700"
                  >
                    <span className="text-emerald-500">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
              <Link href={plan.href} className="mt-8 block">
                <Button
                  variant={plan.featured ? "primary" : "outline"}
                  size="lg"
                  className="w-full"
                >
                  {plan.cta}
                </Button>
              </Link>
            </motion.div>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mt-24 overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-card"
        >
          <h2 className="border-b border-slate-200/80 px-6 py-5 text-lg font-semibold text-slate-900">
            Compare plans
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/50">
                  <th className="px-6 py-3 text-left text-sm font-medium text-slate-700">
                    Feature
                  </th>
                  <th className="px-6 py-3 text-center text-sm font-medium text-slate-700">
                    Free
                  </th>
                  <th className="px-6 py-3 text-center text-sm font-medium text-slate-700">
                    Starter
                  </th>
                  <th className="px-6 py-3 text-center text-sm font-medium text-primary-600">
                    Pro
                  </th>
                </tr>
              </thead>
              <tbody>
                {comparisons.map((row) => (
                  <tr key={row.feature} className="border-b border-slate-100">
                    <td className="px-6 py-3 text-sm text-slate-700">
                      {row.feature}
                    </td>
                    <td className="px-6 py-3 text-center">
                      {row.free ? "✓" : "—"}
                    </td>
                    <td className="px-6 py-3 text-center">
                      {row.starter ? "✓" : "—"}
                    </td>
                    <td className="px-6 py-3 text-center font-medium text-primary-600">
                      {row.pro ? "✓" : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
