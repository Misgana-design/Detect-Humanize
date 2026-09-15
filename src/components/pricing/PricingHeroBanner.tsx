"use client";

import { useEffect, useState } from "react";
import { GraduationCap, Timer } from "lucide-react";
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

function TimeUnit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center gap-1">
      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-white/10 font-mono text-xl font-black tabular-nums text-white backdrop-blur-sm sm:h-14 sm:w-14 sm:text-2xl">
        {pad(value)}
      </div>
      <span className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
        {label}
      </span>
    </div>
  );
}

export default function PricingHeroBanner() {
  const saleEnd = getSaleEndDate();
  const [timeLeft, setTimeLeft] = useState<TimeLeft | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (!saleEnd) return;
    setTimeLeft(calcTimeLeft(saleEnd));

    const id = setInterval(() => {
      const tl = calcTimeLeft(saleEnd);
      setTimeLeft(tl);
      if (!tl) clearInterval(id);
    }, 1_000);

    return () => clearInterval(id);
  }, [saleEnd]);

  // No sale configured, or sale has expired
  if (!saleEnd || (mounted && !timeLeft)) return null;

  // Derive end-of-month label from the sale end date
  const endMonthLabel = saleEnd.toLocaleString("en-US", {
    month: "long",
    timeZone: "UTC",
  });

  return (
    <div
      role="region"
      aria-label="Back to School Sale"
      className="relative mt-10 overflow-hidden rounded-2xl bg-[#0d1a2d] px-6 py-8 shadow-xl sm:px-10"
    >
      {/* Decorative dots */}
      <Dot className="left-4 top-4 h-1.5 w-1.5 opacity-40" />
      <Dot className="right-8 top-6 h-2 w-2 opacity-30" />
      <Dot className="bottom-5 left-1/3 h-1.5 w-1.5 opacity-20" />
      <Dot className="bottom-4 right-4 h-2.5 w-2.5 opacity-25" />
      <Dot className="left-[55%] top-3 h-1 w-1 opacity-30" />

      <div className="relative flex flex-col items-center gap-8 sm:flex-row sm:justify-between">
        {/* Left — badge + copy + circle */}
        <div className="flex items-center gap-6">
          {/* 50% circle */}
          <div className="relative hidden shrink-0 sm:block">
            <svg
              viewBox="0 0 88 88"
              className="h-20 w-20"
              aria-hidden="true"
            >
              {/* Outer ring */}
              <circle
                cx="44"
                cy="44"
                r="40"
                fill="none"
                stroke="#b8972a"
                strokeWidth="2"
                strokeDasharray="6 4"
                strokeLinecap="round"
              />
              {/* Inner fill */}
              <circle cx="44" cy="44" r="34" fill="rgba(184,151,42,0.12)" />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
              <GraduationCap className="mb-0.5 h-4 w-4 text-amber-400" />
              <span className="text-xl font-black text-white">50%</span>
              <span className="text-[10px] font-bold uppercase tracking-widest text-amber-400">
                off
              </span>
            </div>
          </div>

          {/* Text */}
          <div>
            {/* Badge */}
            <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-0.5 text-xs font-bold text-amber-400">
              <GraduationCap className="h-3.5 w-3.5" />
              Back to School Sale
            </span>

            <h2 className="mt-2 text-2xl font-extrabold leading-snug text-white sm:text-3xl">
              Ace the semester with{" "}
              <span className="text-amber-400">half off</span> every plan
            </h2>

            <p className="mt-1.5 max-w-sm text-sm text-slate-400">
              Fresh term energy — 50% off all plans for a limited time. Study
              sharper, write cleaner.
            </p>
          </div>
        </div>

        {/* Right — countdown */}
        <div className="flex shrink-0 flex-col items-center gap-3">
          <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-slate-400">
            <Timer className="h-3.5 w-3.5 text-amber-400" />
            Ends in
          </span>

          {/* Digit tiles — always render placeholders before mount so layout doesn't shift */}
          <div className="flex items-end gap-2">
            <TimeUnit value={mounted && timeLeft ? timeLeft.days  : 0} label="Days"  />
            <Separator />
            <TimeUnit value={mounted && timeLeft ? timeLeft.hours : 0} label="Hours" />
            <Separator />
            <TimeUnit value={mounted && timeLeft ? timeLeft.mins  : 0} label="Mins"  />
            <Separator />
            <TimeUnit value={mounted && timeLeft ? timeLeft.secs  : 0} label="Secs"  />
          </div>

          <span className="flex items-center gap-1 text-[11px] text-slate-500">
            <Timer className="h-3 w-3" />
            Through end of {endMonthLabel}
          </span>
        </div>
      </div>
    </div>
  );
}

function Dot({ className }: { className: string }) {
  return (
    <span
      aria-hidden="true"
      className={`pointer-events-none absolute rounded-full bg-amber-400 ${className}`}
    />
  );
}

function Separator() {
  return (
    <span
      aria-hidden="true"
      className="mb-6 text-lg font-black text-slate-600"
    >
      :
    </span>
  );
}
