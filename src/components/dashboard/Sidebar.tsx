"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  getPlanDefinition,
  getQuotaPeriodLabel,
  getRemainingWords,
} from "@/lib/billing/plans";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { History, Layers3, Settings2, Zap, BarChartBig, Menu, X } from "lucide-react";
import { Brand } from "@/components/layout/Brand";

export function Sidebar() {
  const supabase = createClient();
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

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
    { name: "Overview",       href: "/dashboard",         icon: <BarChartBig size={18} /> },
    { name: "History",        href: "/dashboard/history", icon: <History size={18} />     },
    { name: "Bulk",           href: "/dashboard/bulk",    icon: <Layers3 size={18} />     },
    { name: "Manage Account", href: "/account",           icon: <Settings2 size={18} />   },
  ];

  const plan          = getPlanDefinition(profile?.subscription_tier);
  const wordsUsed     = profile?.words_used || 0;
  const remainingWords = getRemainingWords(profile?.subscription_tier, wordsUsed);
  const percentage    = plan.wordQuota === null
    ? 0
    : Math.min((wordsUsed / plan.wordQuota) * 100, 100);
  const usageLabel    = plan.wordQuota === null
    ? wordsUsed.toLocaleString()
    : `${wordsUsed.toLocaleString()} / ${plan.wordQuota.toLocaleString()}`;
  const creditsLabel  = remainingWords === null ? "No cap" : remainingWords.toLocaleString();

  const sidebarContent = (
    <div className="flex h-full flex-col">
      {/* Brand + close button (mobile only) */}
      <div className="mb-10 flex items-center justify-between px-4 pt-4">
        <Brand size="sm" />
        <button
          onClick={() => setMobileOpen(false)}
          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 lg:hidden"
          aria-label="Close menu"
        >
          <X size={18} />
        </button>
      </div>

      <nav className="flex-1 space-y-1">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            onClick={() => setMobileOpen(false)}
            className={`flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-medium transition-all ${
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

      {/* Credits card */}
      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
        <div className="mb-2 flex items-end justify-between">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
              {plan.name} plan
            </p>
            <p className="text-sm font-bold text-slate-900">{usageLabel}</p>
            <p className="mt-1 text-[11px] text-slate-500">
              Credits left: {creditsLabel}
            </p>
          </div>
          <Zap size={14} className="mb-1 fill-yellow-500 text-yellow-500" />
        </div>
        <p className="mb-3 text-[11px] text-slate-500">
          Max {plan.maxWordsPerInput?.toLocaleString() ?? "no cap"} words per
          input • {getQuotaPeriodLabel(plan)} quota
        </p>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
          <div
            className="h-full bg-indigo-600 transition-all duration-700 ease-out"
            style={{ width: `${percentage}%` }}
          />
        </div>
        <Link href="/pricing">
          <button className="mt-4 w-full cursor-pointer rounded-lg border border-slate-200 bg-white py-2 text-[11px] font-bold text-slate-700 transition-colors hover:bg-slate-100">
            VIEW PLANS
          </button>
        </Link>
      </div>
    </div>
  );

  return (
    <>
      {/* ── Mobile top bar ── */}
      <div className="fixed inset-x-0 top-0 z-30 flex h-14 items-center justify-between border-b border-slate-200 bg-white px-4 lg:hidden">
        <Brand size="sm" />
        <button
          onClick={() => setMobileOpen(true)}
          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
          aria-label="Open menu"
        >
          <Menu size={20} />
        </button>
      </div>

      {/* ── Mobile drawer backdrop ── */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ── Mobile drawer ── */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 border-r border-slate-200 bg-white p-4 shadow-xl transition-transform duration-300 lg:hidden ${
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {sidebarContent}
      </aside>

      {/* ── Desktop sidebar (always visible) ── */}
      <aside className="sticky top-0 hidden h-screen w-64 flex-col border-r border-slate-200 bg-white/95 p-4 shadow-[1px_0_0_0_rgba(15,23,42,0.08)] backdrop-blur lg:flex">
        {sidebarContent}
      </aside>
    </>
  );
}
