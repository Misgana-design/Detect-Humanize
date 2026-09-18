"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Check, CheckCircle2, Sparkles, Star, Users } from "lucide-react";
import PricingHeroBanner from "@/components/pricing/PricingHeroBanner";
import { useProfile } from "@/hooks/userProfile";
import {
  getPlanDefinitions,
  getPlanPrice,
  type BillingCadence,
  type PricingToggleCadence,
} from "@/lib/billing/plans";

interface PricingCardsSectionProps {
  headingLevel?: "h1" | "h2";
}

/**
 * The pricing cards section — replicated from the /pricing page so the
 * homepage and pricing page share identical design, content, and behaviour.
 *
 * "Current plan" detection: when the signed-in user's subscription tier
 * matches a plan, that card's CTA is replaced with a disabled "Current plan"
 * state.
 */
export function PricingCardsSection({
  headingLevel = "h1",
}: PricingCardsSectionProps = {}) {
  const [billingView, setBillingView] = useState<PricingToggleCadence>("yearly");
  const [pendingTier, setPendingTier] = useState<string | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const plans = getPlanDefinitions();

  const { data: profile } = useProfile();
  const currentTier = profile?.subscription_tier ?? null;

  const startCheckout = async (tier: string, cadence: BillingCadence) => {
    if (tier === "free" || cadence === "free") {
      window.location.assign("/auth/signup");
      return;
    }
    setCheckoutError(null);
    setPendingTier(tier);
    try {
      const response = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier, cadence }),
      });
      if (response.status === 401) {
        window.location.assign("/auth/signup");
        return;
      }
      const payload = (await response.json()) as { url?: string; error?: string };
      if (!response.ok || !payload.url)
        throw new Error(payload.error || "Could not start checkout.");
      window.location.assign(payload.url);
    } catch (error) {
      setCheckoutError(
        error instanceof Error ? error.message : "Could not start checkout.",
      );
    } finally {
      setPendingTier(null);
    }
  };

  const Heading = headingLevel;

  return (
    <>
      {/* ── Social proof bar ── */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-12 flex flex-wrap items-center justify-center gap-6 text-sm text-slate-500"
      >
        <span className="flex items-center gap-1.5">
          <Users className="h-4 w-4 text-indigo-400" />
          <strong className="text-slate-700">400K+</strong> students &
          researchers
        </span>
        <span className="hidden h-4 w-px bg-slate-200 sm:block" />
        <span className="flex items-center gap-1">
          {[...Array(5)].map((_, i) => (
            <Star
              key={i}
              className="h-3.5 w-3.5 fill-amber-400 text-amber-400"
            />
          ))}
          <span className="ml-1">
            <strong className="text-slate-700">4.9</strong> / 5 rating
          </span>
        </span>
        <span className="hidden h-4 w-px bg-slate-200 sm:block" />
        <span className="flex items-center gap-1.5">
          <Check className="h-4 w-4 text-emerald-500" />
          <strong className="text-slate-700">No credit card</strong> required
          for free plan
        </span>
      </motion.div>

      {/* ── Heading ── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mx-auto max-w-2xl text-center"
      >
        <Heading className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          Simple, transparent pricing
        </Heading>
        <p className="mt-4 text-base text-slate-600">
          Start free. Scale when you need to. No hidden fees.
        </p>

        {/* Toggle */}
        <div className="mt-10 flex flex-col items-center gap-3">
          <div className="flex items-center gap-4">
            <span
              className={`text-sm font-medium ${billingView === "monthly" ? "text-slate-900" : "text-slate-400"}`}
            >
              Monthly
            </span>
            <button
              role="switch"
              aria-checked={billingView === "yearly"}
              onClick={() =>
                setBillingView((v) => (v === "yearly" ? "monthly" : "yearly"))
              }
              className={`relative h-7 w-14 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 hover:cursor-pointer ${billingView === "yearly" ? "bg-indigo-600" : "bg-slate-200"}`}
            >
              <span
                className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all duration-200 ${billingView === "yearly" ? "left-8" : "left-1"}`}
              />
            </button>
            <span
              className={`text-sm font-medium ${billingView === "yearly" ? "text-slate-900" : "text-slate-400"}`}
            >
              Yearly
            </span>
            <span className="animate-pulse rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-700">
              Save up to 50%
            </span>
          </div>
          {billingView === "yearly" && (
            <p className="text-xs text-slate-400">
              Billed annually — cancel anytime
            </p>
          )}
        </div>
      </motion.div>

      {/* ── Back-to-School sale banner ── */}
      <PricingHeroBanner />

      {/* ── Pricing cards ── */}
      <div className="mt-16 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {plans.map((plan, i) => {
          const pricing = getPlanPrice(plan, billingView);
          const cadenceLabel =
            pricing.cadence === "free"
              ? ""
              : pricing.cadence === "weekly"
                ? "/week"
                : "/mo";

          // Savings % for yearly vs monthly
          const monthlyPrice = plan.prices.monthly;
          const savingsPct =
            billingView === "yearly" &&
            monthlyPrice &&
            pricing.cadence === "yearly" &&
            pricing.amount > 0
              ? Math.round(
                  ((monthlyPrice - pricing.amount) / monthlyPrice) * 100,
                )
              : 0;

          const isCurrentPlan = currentTier === plan.tier;

          return (
            <motion.div
              key={plan.tier}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className={`relative flex flex-col rounded-2xl border bg-white p-7 shadow-sm transition-shadow hover:shadow-md ${
                plan.featured
                  ? "border-indigo-300 ring-2 ring-indigo-200"
                  : "border-slate-200"
              }`}
            >
              {plan.featured && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 rounded-full bg-indigo-600 px-3 py-1 text-xs font-bold text-white shadow">
                  <Sparkles size={11} /> Most popular
                </div>
              )}
              {plan.isNew && !plan.featured && (
                <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-amber-500 px-3 py-1 text-xs font-bold text-white shadow">
                  New
                </div>
              )}
              {pricing.cadence === "weekly" && (
                <span className="mb-3 inline-flex w-fit rounded-full bg-amber-100 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-amber-700">
                  Weekly billing
                </span>
              )}

              <h3 className="text-lg font-bold text-slate-900">
                {plan.name}
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                {plan.description}
              </p>

              <div className="mt-5">
                {/* Yearly view: show both prices — monthly crossed out, yearly active */}
                {billingView === "yearly" &&
                pricing.cadence === "yearly" &&
                plan.prices.monthly ? (
                  <div className="space-y-1">
                    {/* Crossed-out monthly price */}
                    <div className="flex items-baseline gap-1 opacity-50">
                      <span className="text-2xl font-bold tabular-nums text-slate-500 line-through">
                        ${plan.prices.monthly}
                      </span>
                      <span className="text-sm text-slate-400 line-through">
                        /mo
                      </span>
                      <span className="ml-1 text-xs text-slate-400 line-through">
                        billed monthly
                      </span>
                    </div>
                    {/* Active yearly price */}
                    <div className="flex items-end gap-1">
                      <span className="text-4xl font-black tabular-nums text-slate-900">
                        ${pricing.amount}
                      </span>
                      <span className="mb-1 text-slate-400">/mo</span>
                      {savingsPct > 0 && (
                        <span className="mb-1 ml-1 rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-700">
                          Save {savingsPct}%
                        </span>
                      )}
                    </div>
                    <p className="text-xs font-medium text-slate-500">
                      Billed{" "}
                      <span className="font-bold text-slate-700">
                        ${(pricing.amount * 12).toFixed(2)}
                      </span>
                      {" "}every 12 months
                      {savingsPct > 0 && ` — save ${savingsPct}%`}
                    </p>
                  </div>
                ) : (
                  /* Monthly view or weekly/free plans */
                  <div className="flex items-end gap-1">
                    <span className="text-4xl font-black tabular-nums text-slate-900">
                      ${pricing.amount}
                    </span>
                    {cadenceLabel && (
                      <span className="mb-1 text-slate-400">
                        {cadenceLabel}
                      </span>
                    )}
                  </div>
                )}
              </div>

              <ul className="mt-5 flex-1 space-y-2.5">
                {plan.features.map((f) => (
                  <li
                    key={f}
                    className="flex items-start gap-2 text-sm text-slate-700"
                  >
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                    {f}
                  </li>
                ))}
              </ul>

              <div className="mt-7">
                {plan.tier === "free" ? (
                  isCurrentPlan ? (
                    <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-center text-sm font-medium text-emerald-700">
                      Your current plan
                    </p>
                  ) : (
                    <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-center text-sm font-medium text-slate-600">
                      Free plan - no subscription required
                    </p>
                  )
                ) : (
                  <>
                    {isCurrentPlan ? (
                      <button
                        disabled
                        className="flex w-full cursor-default items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-bold text-emerald-700"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        Current plan
                      </button>
                    ) : (
                      <button
                        disabled={pendingTier === plan.tier}
                        onClick={() =>
                          void startCheckout(plan.tier, pricing.cadence)
                        }
                        className={`w-full rounded-xl px-4 py-3 text-sm font-bold transition hover:cursor-pointer ${
                          plan.featured
                            ? "bg-indigo-600 text-white shadow-md shadow-indigo-100 hover:bg-indigo-700"
                            : "border border-slate-200 bg-white text-slate-800 hover:bg-slate-50"
                        } disabled:cursor-not-allowed disabled:opacity-60`}
                      >
                        {pendingTier === plan.tier ? (
                          <span className="flex items-center justify-center gap-2">
                            <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                            Redirecting...
                          </span>
                        ) : (
                          plan.cta
                        )}
                      </button>
                    )}
                    {billingView === "yearly" &&
                      pricing.cadence === "yearly" &&
                      !isCurrentPlan && (
                        <p className="mt-2 text-center text-[11px] text-slate-400">
                          🔒 Secure checkout · Cancel anytime
                        </p>
                      )}
                  </>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>

      {checkoutError && (
        <div className="mx-auto mt-6 max-w-3xl rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {checkoutError}
        </div>
      )}

      {/* ── Trust signals ── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="mt-12 flex flex-wrap items-center justify-center gap-8 text-xs text-slate-400"
      >
        {[
          "256-bit SSL encryption",
          "Cancel anytime",
          "No hidden fees",
          "Instant access after payment",
        ].map((t) => (
          <span key={t} className="flex items-center gap-1.5">
            <Check className="h-3.5 w-3.5 text-emerald-400" /> {t}
          </span>
        ))}
      </motion.div>
    </>
  );
}