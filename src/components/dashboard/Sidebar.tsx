"use client";

import { useQuery } from "@tanstack/react-query";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { History, Sparkles, Settings, Zap } from "lucide-react";

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
    { name: "Humanizer", href: "/dashboard", icon: <Sparkles size={18} /> },
    {
      name: "History",
      href: "/dashboard/history",
      icon: <History size={18} />,
    },
    {
      name: "Settings",
      href: "/dashboard/settings",
      icon: <Settings size={18} />,
    },
  ];

  // Logic for the progress bar
  const limits: Record<string, number> = {
    free: 50,
    pro: 500,
    enterprise: 5000,
  };
  const tier = profile?.subscription_tier || "free";
  const limit = limits[tier] || 50;
  const usage = profile?.api_usage_count || 0;
  const percentage = Math.min((usage / limit) * 100, 100);

  return (
    <aside className="w-64 border-r border-gray-100 bg-white h-screen sticky top-0 flex flex-col p-4 shadow-[1px_0_0_0_rgba(0,0,0,0.05)]">
      <div className="mb-10 px-4 pt-4">
        <h2 className="text-xl font-bold tracking-tighter text-black flex items-center gap-2">
          <div className="w-6 h-6 bg-black rounded flex items-center justify-center">
            <div className="w-2 h-2 bg-white rotate-45" />
          </div>
          HumanizeAI
        </h2>
      </div>

      <nav className="flex-1 space-y-1">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition-all ${
              pathname === item.href
                ? "bg-slate-900 text-white shadow-md"
                : "text-slate-500 hover:bg-slate-50 hover:text-slate-900"
            }`}
          >
            {item.icon}
            {item.name}
          </Link>
        ))}
      </nav>

      {/* CREDITS PROGRESS CARD */}
      <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
        <div className="flex justify-between items-end mb-2">
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Usage
            </p>
            <p className="text-sm font-bold text-slate-900">
              {usage} / {limit}
            </p>
          </div>
          <Zap size={14} className="text-yellow-500 fill-yellow-500 mb-1" />
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
          <div
            className="bg-black h-full transition-all duration-700 ease-out"
            style={{ width: `${percentage}%` }}
          />
        </div>
        <Link href={"/pricing"}>
          <button className="w-full mt-4 py-2 bg-white border border-slate-200 rounded-lg text-[11px] font-bold text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer">
            UPGRADE PLAN
          </button>
        </Link>
      </div>
    </aside>
  );
}
