"use client";

import { getPlanDefinition, getRemainingWords } from "@/lib/billing/plans";
import type { UserProfile } from "@/types/UserProfile";

type Props = {
  profile?: UserProfile | null;
  wordCount: number;
};

export function QuotaInline({ profile, wordCount }: Props) {
  const plan = getPlanDefinition(profile?.subscription_tier);
  const wordsUsed = profile?.words_used ?? 0;
  const remaining = getRemainingWords(profile?.subscription_tier, wordsUsed);
  const exceedsInput = plan.maxWordsPerInput !== null && wordCount > plan.maxWordsPerInput;
  const exceedsQuota = remaining !== null && wordCount > remaining;

  return (
    <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold text-slate-500">
      <span>
        {wordCount.toLocaleString()}
        {plan.maxWordsPerInput ? ` / ${plan.maxWordsPerInput.toLocaleString()}` : ""} words
      </span>
      <span className="h-1 w-1 rounded-full bg-slate-300" />
      <span>{plan.name} plan</span>
      {remaining !== null && (
        <>
          <span className="h-1 w-1 rounded-full bg-slate-300" />
          <span className={exceedsQuota ? "text-rose-600" : "text-slate-500"}>
            {remaining.toLocaleString()} left
          </span>
        </>
      )}
      {(exceedsInput || exceedsQuota) && (
        <span className="rounded-full bg-rose-50 px-2 py-0.5 text-rose-600">
          {exceedsInput ? "Input limit exceeded" : "Quota exceeded"}
        </span>
      )}
    </div>
  );
}
