"use client";

import { useState } from "react";
import { Check, Coins, Loader2, Lock, Sparkles } from "lucide-react";
import { CREDIT_PACKS } from "@/lib/billing/credits";

const PACK_FEATURES = [
  "Credits never expire",
  "Instant credit delivery",
  "Works with any plan",
  "No expiration date",
];

/**
 * One-time extra credit packs for paid subscribers.
 *
 * Parent components decide visibility: paid users via the workspace quota
 * block and the dashboard. The checkout API independently rejects free users.
 */
export function ExtraCreditsCard() {
  const [pendingPack, setPendingPack] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const buyPack = async (packKey: string) => {
    if (pendingPack) return;
    setError(null);
    setPendingPack(packKey);
    try {
      const response = await fetch("/api/billing/credits-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pack: packKey }),
      });
      if (response.status === 401) {
        window.location.assign("/auth/signup");
        return;
      }
      const payload = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !payload.url)
        throw new Error(payload.error || "Could not start checkout.");
      window.location.assign(payload.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not start checkout.");
      setPendingPack(null);
    }
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-indigo-100 bg-white shadow-sm">
      {/* Header */}
      <div className="border-b border-indigo-100 bg-linear-to-r from-indigo-50 to-emerald-50 px-6 py-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="flex items-center gap-2 text-lg font-bold text-slate-900">
              <Coins className="h-5 w-5 text-indigo-500" />
              Need Extra Credits?
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Running low? Top up with a one-time credit pack. No subscription
              required.
            </p>
          </div>
          <span className="hidden shrink-0 rounded-full bg-white px-3 py-1 text-[11px] font-bold text-indigo-600 shadow-sm sm:inline-flex">
            Works with any plan
          </span>
        </div>
      </div>

      {/* Packs */}
      <div className="grid gap-4 p-6 sm:grid-cols-3">
        {CREDIT_PACKS.map((pack) => {
          const isPending = pendingPack === pack.key;
          return (
            <div
              key={pack.key}
              className="flex flex-col rounded-2xl border border-slate-200 bg-slate-50/50 p-5"
            >
              <p className="font-bold text-slate-900">{pack.label}</p>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-3xl font-black tabular-nums text-slate-900">
                  ${pack.price.toFixed(2)}
                </span>
                <span className="text-sm text-slate-400">one-time</span>
              </div>

              <ul className="mt-4 flex-1 space-y-2">
                {PACK_FEATURES.map((feature) => (
                  <li
                    key={feature}
                    className="flex items-start gap-2 text-[13px] text-slate-600"
                  >
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                    {feature}
                  </li>
                ))}
              </ul>

              <button
                onClick={() => void buyPack(pack.key)}
                disabled={isPending}
                className="mt-5 inline-flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-indigo-100 transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Redirecting...
                  </>
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Buy Credits
                  </>
                )}
              </button>

              <p className="mt-2 text-center text-[11px] text-slate-400">
                <Lock className="mr-1 inline h-3 w-3" />
                Secure checkout · Instant delivery
              </p>
            </div>
          );
        })}
      </div>

      {error && (
        <div className="border-t border-rose-100 bg-rose-50 px-6 py-3 text-sm text-rose-700">
          {error}
        </div>
      )}
    </div>
  );
}