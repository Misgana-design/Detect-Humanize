"use client";

import { useQuery } from "@tanstack/react-query";
import {
  getPlanDefinition,
  getQuotaPeriodLabel,
  getRemainingWords,
} from "@/lib/billing/plans";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { History, Settings2, Zap, BarChartBig } from "lucide-react";
import { Brand } from "@/components/layout/Brand";


export function Sidebar() {
  const supabase = createClient();
  const pathname = usePathname();

  // 1. Fetch User Profile for Usage Data
  const { data: profile } = useQuery({
    queryKey: ["user-profile"],
    queryFn: async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return null;
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      return data;
    },
  });

  const navItems = [
    { name: "Overview", href: "/dashboard", icon: <BarChartBig size={18} /> },
    {
      name: "History",
      href: "/dashboard/history",
      icon: <History size={18} />,
    },
    {
      name: "Manage Account",
      href: "/account",
      icon: <Settings2 size={18} />,
    },
  ];

  const plan = getPlanDefinition(profile?.subscription_tier);
  const wordsUsed = profile?.words_used || 0;
  const remainingWords = getRemainingWords(profile?.subscription_tier, wordsUsed);
  // remainingWords is null for unlimited plans — show "Unlimited", not a stale credits value
  const percentage =
    plan.wordQuota === null
      ? 0
      : Math.min((wordsUsed / plan.wordQuota) * 100, 100);
  const usageLabel =
    plan.wordQuota === null
      ? "Unlimited"
      : `${wordsUsed.toLocaleString()} / ${plan.wordQuota.toLocaleString()}`;
  const creditsLabel =
    remainingWords === null ? "Unlimited" : remainingWords.toLocaleString();

  return (
    <aside className="sticky top-0 flex h-screen w-64 flex-col border-r border-slate-200 bg-white/95 p-4 shadow-[1px_0_0_0_rgba(15,23,42,0.08)] backdrop-blur">
      <div className="mb-10 px-4 pt-4">
        <Brand size="sm" />
      </div>

      <nav className="flex-1 space-y-1">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
              pathname === item.href
                ? "bg-indigo-600 text-white shadow-md shadow-indigo-100"
                : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            {item.icon}
            {item.name}
          </Link>
        ))}
      </nav>

      {/* CREDITS PROGRESS CARD */}
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <div className="flex justify-between items-end mb-2">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              {plan.name} plan
            </p>
            <p className="text-sm font-bold text-slate-900">
              {usageLabel}
            </p>
            <p className="mt-1 text-[11px] text-slate-500">
              Credits left: {creditsLabel}
            </p>
          </div>
          <Zap size={14} className="text-yellow-500 fill-yellow-500 mb-1" />
        </div>
        <p className="mb-3 text-[11px] text-slate-500">
          Max {plan.maxWordsPerInput?.toLocaleString() ?? "unlimited"} words per
          input • {getQuotaPeriodLabel(plan)} quota
        </p>

        {/* Progress Bar */}
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full bg-indigo-600 transition-all duration-700 ease-out"
            style={{ width: `${percentage}%` }}
          />
        </div>
        <Link href={"/pricing"}>
          <button className="mt-4 w-full cursor-pointer rounded-lg border border-slate-200 bg-white py-2 text-[11px] font-bold text-slate-700 transition-colors hover:bg-slate-100">
            VIEW PLANS
          </button>
        </Link>
      </div>
    </aside>
  );
}
