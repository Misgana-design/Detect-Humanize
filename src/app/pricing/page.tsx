"use client";

import { Fragment } from "react";

import Link from "next/link";
import { motion } from "framer-motion";
import { Check, Minus, Zap } from "lucide-react";
import {
  getPlanDefinitions,
  type BillingTier,
} from "@/lib/billing/plans";
import { PricingCardsSection } from "@/components/pricing/PricingCardsSection";

// ── Detailed comparison rows ────────────────────────────────────────────────
type CompareRow = {
  category: string;
  feature: string;
  values: Partial<Record<BillingTier, string | boolean>>;
};

const COMPARE_ROWS: CompareRow[] = [
  { category: "Languages", feature: "Multi-language support", values: { free: true, basic: true, pro: true, ultra: true, pro_weekly: true } },
  // Humanization
  { category: "Humanization", feature: "Humanizer",          values: { free: true, basic: true, pro: true, ultra: true, pro_weekly: true } },
  { category: "Humanization", feature: "Humanizer pipeline", values: { free: "1-pass", basic: "3-pass", pro: "3-pass", ultra: "3-pass", pro_weekly: "3-pass" } },
  { category: "Humanization", feature: "Humanizer model",    values: { free: "Flash", basic: "Flash", pro: "Pro", ultra: "Pro", pro_weekly: "Pro" } },
  { category: "Humanization", feature: "Available tones",    values: { free: "Casual only", basic: "All tones", pro: "All tones", ultra: "All tones", pro_weekly: "All tones" } },
  { category: "Humanization", feature: "Re-Humanize",        values: { free: false, basic: true, pro: true, ultra: true, pro_weekly: true } },
  { category: "Workflow", feature: "Draft recovery",         values: { free: true, basic: true, pro: true, ultra: true, pro_weekly: true } },
  // Quotas
  { category: "Quotas", feature: "Words per input",          values: { free: "500", basic: "500", pro: "1,500", ultra: "2,500", pro_weekly: "1,000" } },
  { category: "Quotas", feature: "Word quota",               values: { free: "1,000/mo", basic: "4,000/mo", pro: "20,000/mo", ultra: "45,000/mo", pro_weekly: "5,000/wk" } },
  // Exports
  { category: "Exports", feature: "Copy for Google Docs",    values: { free: false, basic: true, pro: true, ultra: true, pro_weekly: true } },
  { category: "Exports", feature: "PDF export",              values: { free: false, basic: true, pro: true, ultra: true, pro_weekly: true } },
  { category: "Exports", feature: "TXT / MD / DOC exports",  values: { free: true, basic: true, pro: true, ultra: true, pro_weekly: true } },
  // History
  { category: "History", feature: "Document history",        values: { free: "Last 3", basic: "Full", pro: "Full", ultra: "Full", pro_weekly: "Full" } },
  { category: "History", feature: "Comparison mode",         values: { free: "Last 3", basic: "Full", pro: "Full", ultra: "Full", pro_weekly: "Full" } },
  // Team
  { category: "Team", feature: "Team dashboard",             values: { free: false, basic: false, pro: false, ultra: true, pro_weekly: false } },
  { category: "Team", feature: "Multi-user access",          values: { free: false, basic: false, pro: false, ultra: true, pro_weekly: false } },
  { category: "API", feature: "API access",                  values: { free: false, basic: false, pro: true, ultra: true, pro_weekly: true } },
  { category: "API", feature: "API key management",          values: { free: false, basic: false, pro: true, ultra: true, pro_weekly: true } },
  { category: "API", feature: "Bulk humanizer endpoint",     values: { free: false, basic: false, pro: false, ultra: true, pro_weekly: false } },
  // Support
  { category: "Support", feature: "Support level",           values: { free: "Email", basic: "Email", pro: "Priority", ultra: "Dedicated", pro_weekly: "Priority" } },
];

const DISPLAY_TIERS: BillingTier[] = ["free", "basic", "pro", "ultra", "pro_weekly"];

function CellValue({ value }: { value: string | boolean | undefined }) {
  if (value === true)  return <Check className="mx-auto h-4 w-4 text-emerald-500" />;
  if (value === false || value === undefined) return <Minus className="mx-auto h-4 w-4 text-slate-300" />;
  return <span className="text-xs font-medium text-slate-700">{value}</span>;
}

export default function PricingPage() {
  const plans = getPlanDefinitions();

  const categories = [...new Set(COMPARE_ROWS.map((r) => r.category))];

  return (
    <div className="min-h-screen bg-slate-50">
      <main className="mx-auto max-w-7xl px-4 py-16 md:py-24">
        {/* ── Pricing cards section ── */}
        <PricingCardsSection />

        {/* ── Compare plans table ── */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-24 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
        >
          <div className="border-b border-slate-100 px-6 py-5">
            <h2 className="flex items-center gap-2 text-xl font-bold text-slate-900">
              <Zap className="h-5 w-5 text-indigo-500" />
              Compare all plans
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Every feature, side by side.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full min-w-175 border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="w-48 px-5 py-4 text-left text-xs font-bold uppercase tracking-widest text-slate-400">
                    Feature
                  </th>
                  {DISPLAY_TIERS.map((tier) => {
                    const plan = plans.find((p) => p.tier === tier);
                    return (
                      <th
                        key={tier}
                        className={`px-4 py-4 text-center text-xs font-bold uppercase tracking-widest ${
                          tier === "pro" ? "text-indigo-600" : "text-slate-500"
                        }`}
                      >
                        {plan?.name}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {categories.map((category) => {
                  const rows = COMPARE_ROWS.filter(
                    (r) => r.category === category,
                  );
                  return (
                    <Fragment key={category}>
                      <tr className="border-t-2 border-slate-100 bg-slate-50/60">
                        <td
                          colSpan={DISPLAY_TIERS.length + 1}
                          className="px-5 py-2 text-[11px] font-black uppercase tracking-widest text-slate-400"
                        >
                          {category}
                        </td>
                      </tr>
                      {rows.map((row) => (
                        <tr
                          key={row.feature}
                          className="border-b border-slate-50 transition-colors hover:bg-slate-50/50"
                        >
                          <td className="px-5 py-3 text-sm text-slate-700">
                            {row.feature}
                          </td>
                          {DISPLAY_TIERS.map((tier) => (
                            <td
                              key={`${row.feature}-${tier}`}
                              className={`px-4 py-3 text-center ${tier === "pro" ? "bg-indigo-50/30" : ""}`}
                            >
                              <CellValue value={row.values[tier]} />
                            </td>
                          ))}
                        </tr>
                      ))}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* ── FAQ nudge ── */}
        <p className="mt-10 text-center text-sm text-slate-500">
          Questions?{" "}
          <Link
            href="/faq"
            className="font-semibold text-indigo-600 hover:underline"
          >
            Read the FAQ
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
      </main>
    </div>
  );
}