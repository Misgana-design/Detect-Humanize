"use client";

import { useState } from "react";
import { CreditCard, Sparkles } from "lucide-react";

export function UpgradeBanner() {
  const [error, setError] = useState<string | null>(null);

  const handleUpgrade = async () => {
    setError(null);
    const response = await fetch("/api/billing/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tier: "pro", cadence: "monthly" }),
    });
    const payload = (await response.json()) as { url?: string; error?: string };

    if (!response.ok || !payload.url) {
      setError(payload.error || "Could not start checkout.");
      return;
    }

    window.location.href = payload.url;
  };

  return (
    <div className="bg-linear-to-br from-indigo-50 to-blue-50 border border-indigo-100 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
      <div className="flex items-center gap-4">
        {/* Icon */}
        <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-md shadow-indigo-100">
          <Sparkles size={24} className="fill-current" />
        </div>

        {/* Text */}
        <div>
          <h3 className="text-sm font-bold text-slate-900">
            You&apos;ve hit the Free Tier limit!
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Upgrade to Pro to get 1,000 scans per month and access advanced
            humanization.
          </p>
        </div>
      </div>

      {/* Action Button */}
      <div className="flex flex-col items-end gap-2">
        <button
          type="button"
          onClick={() => void handleUpgrade()}
          className="inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-black px-5 py-2.5 text-xs font-semibold text-white shadow-md transition-all hover:bg-slate-800"
        >
          <CreditCard size={14} />
          Subscribe with Polar
        </button>
        {error && <p className="text-[11px] text-rose-600">{error}</p>}
      </div>
    </div>
  );
}
