"use client";

import { Zap } from "lucide-react";
import { getPlanDefinition, getRemainingWords, type BillingTier } from "@/lib/billing/plans";

interface CreditBadgeProps {
  wordsUsed: number;
  tier: BillingTier;
}

export function CreditBadge({ wordsUsed, tier }: CreditBadgeProps) {
  const plan = getPlanDefinition(tier);
  const remaining = getRemainingWords(tier, wordsUsed);
  const limit = plan.wordQuota;
  const isLow =
    remaining !== null && limit !== null ? remaining <= limit * 0.2 : false;

  return (
    <div
      className={`flex items-center gap-2 rounded-full border px-3 py-1 ${
        isLow
          ? "border-rose-200 bg-rose-50"
          : "border-emerald-200 bg-emerald-50"
      }`}
    >
      <Zap
        className={`h-3.5 w-3.5 ${
          isLow ? "fill-rose-500 text-rose-500" : "fill-emerald-500 text-emerald-500"
        }`}
      />
      <span
        className={`text-xs font-bold ${isLow ? "text-rose-700" : "text-emerald-700"}`}
      >
        {remaining === null || limit === null
          ? "Unlimited credits"
          : `${remaining} / ${limit} Credits Left`}
      </span>
    </div>
  );
}
