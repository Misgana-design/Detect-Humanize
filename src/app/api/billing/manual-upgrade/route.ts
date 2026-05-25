/**
 * POST /api/billing/manual-upgrade
 *
 * DEVELOPMENT ONLY — manually upgrades the current user's plan.
 * Use this to test plan-gated features while debugging the webhook.
 *
 * Remove or protect this endpoint before going to production.
 *
 * Body: { tier: "basic" | "pro" | "ultra" | "pro_weekly", cadence?: "monthly" | "yearly" | "weekly" }
 */

import { NextResponse } from "next/server";
import { createServerSupabaseClient, createServiceSupabaseClient } from "@/lib/supabase/server";
import {
  getPlanDefinition,
  getPlanStartingCredits,
  type BillingTier,
  type BillingCadence,
} from "@/lib/billing/plans";

export async function POST(request: Request) {
  // Block in production
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production" }, { status: 403 });
  }

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const body = (await request.json()) as { tier?: string; cadence?: string };
  const tier = (body.tier ?? "pro") as BillingTier;
  const cadence = (body.cadence ?? "monthly") as BillingCadence;

  const plan = getPlanDefinition(tier);
  if (plan.tier === "free") {
    return NextResponse.json({ error: "Use tier=basic/pro/ultra/pro_weekly" }, { status: 400 });
  }

  if (!plan.supportedCadences.includes(cadence)) {
    return NextResponse.json(
      { error: `${plan.name} does not support ${cadence} billing.` },
      { status: 400 },
    );
  }

  const serviceClient = createServiceSupabaseClient();

  const { error } = await serviceClient
    .from("profiles")
    .update({
      subscription_tier: plan.tier,
      billing_cadence: cadence,
      polar_subscription_id: `manual_test_${Date.now()}`,
      words_used: 0,
      api_usage_count: 0,
      credits: getPlanStartingCredits(plan.tier),
    })
    .eq("id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  console.log(`[manual-upgrade] ✅ Upgraded user ${user.id} to ${tier}/${cadence}`);

  return NextResponse.json({
    ok: true,
    message: `Upgraded to ${plan.name} (${cadence})`,
    userId: user.id,
    tier: plan.tier,
    cadence,
  });
}

export async function DELETE() {
  // Block in production
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not available in production" }, { status: 403 });
  }

  const supabase = await createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const serviceClient = createServiceSupabaseClient();
  const { error } = await serviceClient
    .from("profiles")
    .update({
      subscription_tier: "free",
      billing_cadence: "free",
      polar_subscription_id: null,
      words_used: 0,
      api_usage_count: 0,
      credits: 1000,
    })
    .eq("id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  console.log(`[manual-upgrade] ⬇️  Reset user ${user.id} to free`);

  return NextResponse.json({ ok: true, message: "Reset to free plan" });
}
