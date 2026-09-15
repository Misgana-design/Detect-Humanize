"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { X, GraduationCap } from "lucide-react";
import { getSaleEndDate } from "@/lib/sale";

interface TimeLeft {
  days: number;
  hours: number;
  mins: number;
  secs: number;
}

function calcTimeLeft(end: Date): TimeLeft | null {
  const diff = end.getTime() - Date.now();
  if (diff <= 0) return null;
  return {
    days: Math.floor(diff / 86_400_000),
    hours: Math.floor((diff % 86_400_000) / 3_600_000),
    mins: Math.floor((diff % 3_600_000) / 60_000),
    secs: Math.floor((diff % 60_000) / 1_000),
  };
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}

const DISMISS_KEY = "sale_banner_dismissed_v1";

export default function SaleBanner() {
  const saleEnd = getSaleEndDate();
  const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(
    saleEnd ? calcTimeLeft(saleEnd) : null,
  );
  const [dismissed, setDismissed] = useState(true); // start hidden to avoid SSR flash

  // Restore dismissal state after mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const wasDismissed = localStorage.getItem(DISMISS_KEY) === "1";
      setDismissed(wasDismissed);
    }
  }, []);

  // Countdown tick
  useEffect(() => {
    if (!saleEnd || dismissed) return;
    const id = setInterval(() => {
      const tl = calcTimeLeft(saleEnd);
      setTimeLeft(tl);
      if (!tl) clearInterval(id);
    }, 1_000);
    return () => clearInterval(id);
  }, [saleEnd, dismissed]);

  const handleDismiss = () => {
    localStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
  };

  // Hide if: no end date configured, dismissed, or sale expired
  if (!saleEnd || dismissed || !timeLeft) return null;

  const { days, hours, mins, secs } = timeLeft;

  return (
    <div
      role="banner"
      aria-label="Back to School Sale"
      className="relative z-60 w-full bg-[#0f172a] text-white"
    >
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-x-4 gap-y-1.5 px-10 py-2.5 text-sm">
        {/* Label pill */}
        <span className="flex items-center gap-1.5 rounded-full bg-amber-500/20 px-3 py-0.5 text-xs font-bold uppercase tracking-wide text-amber-400">
          <GraduationCap className="h-3.5 w-3.5" />
          Back to School
        </span>

        {/* Copy */}
        <span className="text-slate-300">
          Campus special —{" "}
          <span className="font-bold text-white">50% OFF all plans</span>
        </span>

        {/* Countdown */}
        <span className="font-mono text-xs tabular-nums text-slate-400">
          Ends in{" "}
          <span className="text-white">
            {pad(days)}d {pad(hours)}h {pad(mins)}m {pad(secs)}s
          </span>
        </span>

        {/* CTA */}
        <Link
          href="/pricing"
          className="inline-flex items-center gap-1 rounded-full bg-amber-500 px-3.5 py-1 text-xs font-bold text-white shadow transition hover:bg-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2 focus:ring-offset-[#0f172a]"
        >
          Claim deal →
        </Link>
      </div>

      {/* Dismiss */}
      <button
        onClick={handleDismiss}
        aria-label="Dismiss sale banner"
        className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-slate-400 transition hover:bg-white/10 hover:text-white focus:outline-none focus:ring-2 focus:ring-white/40"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
