import { NextResponse } from "next/server";
import { validateEvent, WebhookVerificationError } from "@polar-sh/sdk/webhooks";
import { createServiceSupabaseClient } from "@/lib/supabase/server";
import { createPolarClient } from "@/lib/billing/polar";
import {
  getPlanStartingCredits,
  type BillingCadence,
  type BillingTier,
} from "@/lib/billing/plans";

type PlanMapping = { tier: BillingTier; cadence: BillingCadence };
type PolarRecord = Record<string, unknown>;

function buildProductMap(): Map<string, PlanMapping> {
  const entries: Array<[string | undefined, PlanMapping]> = [
    [process.env.POLAR_PRODUCT_BASIC_MONTHLY_ID, { tier: "basic", cadence: "monthly" }],
    [process.env.POLAR_PRODUCT_BASIC_YEARLY_ID, { tier: "basic", cadence: "yearly" }],
    [process.env.POLAR_PRODUCT_PRO_MONTHLY_ID, { tier: "pro", cadence: "monthly" }],
    [process.env.POLAR_PRODUCT_PRO_YEARLY_ID, { tier: "pro", cadence: "yearly" }],
    [process.env.POLAR_PRODUCT_ULTRA_MONTHLY_ID, { tier: "ultra", cadence: "monthly" }],
    [process.env.POLAR_PRODUCT_ULTRA_YEARLY_ID, { tier: "ultra", cadence: "yearly" }],
    [process.env.POLAR_PRODUCT_UNLIMITED_MONTHLY_ID, { tier: "ultra", cadence: "monthly" }],
    [process.env.POLAR_PRODUCT_UNLIMITED_YEARLY_ID, { tier: "ultra", cadence: "yearly" }],
    [process.env.POLAR_PRODUCT_ENTERPRISE_MONTHLY_ID, { tier: "ultra", cadence: "monthly" }],
    [process.env.POLAR_PRODUCT_ENTERPRISE_YEARLY_ID, { tier: "ultra", cadence: "yearly" }],
    [process.env.POLAR_PRODUCT_PRO_WEEKLY_ID, { tier: "pro_weekly", cadence: "weekly" }],
  ];

  const map = new Map<string, PlanMapping>();
  for (const [id, mapping] of entries) {
    if (id) map.set(id, mapping);
  }
  return map;
}

const PRODUCT_MAP = buildProductMap();

function asRecord(value: unknown): PolarRecord | null {
  return value && typeof value === "object" ? (value as PolarRecord) : null;
}

function getString(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) return value;
  }
  return null;
}

function normalizePolarData(data: PolarRecord, eventType: string) {
  const customer = asRecord(data.customer);
  const subscription = asRecord(data.subscription);
  const metadata = asRecord(data.metadata);
  const subscriptionMetadata = asRecord(subscription?.metadata);
  const isSubscriptionEvent = eventType.startsWith("subscription.");

  const externalCustomerId = getString(
    data.externalCustomerId,
    data.external_customer_id,
    customer?.externalId,
    customer?.external_id,
    metadata?.user_id,
    metadata?.userId,
    subscriptionMetadata?.user_id,
    subscriptionMetadata?.userId,
  );

  const email = getString(data.email, customer?.email);
  const polarCustomerId = getString(data.customerId, data.customer_id, customer?.id, subscription?.customerId, subscription?.customer_id);
  const productId = getString(
    data.productId,
    data.product_id,
    subscription?.productId,
    subscription?.product_id,
    metadata?.product_id,
    metadata?.productId,
  );
  const subscriptionId = getString(
    data.subscriptionId,
    data.subscription_id,
    isSubscriptionEvent ? data.id : null,
    subscription?.id,
    metadata?.subscription_id,
    metadata?.subscriptionId,
  );
  const status = getString(data.status, subscription?.status);

  return {
    externalCustomerId,
    email,
    polarCustomerId,
    productId,
    subscriptionId,
    status,
  };
}

async function resolveUserId(input: {
  externalCustomerId: string | null;
  email: string | null;
  polarCustomerId: string | null;
  subscriptionId: string | null;
}): Promise<string | null> {
  const supabase = createServiceSupabaseClient();

  if (input.externalCustomerId) {
    const { data, error } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", input.externalCustomerId)
      .maybeSingle();

    if (error) throw new Error(`Profile lookup by external customer ID failed: ${error.message}`);
    if (data?.id) return data.id;
  }

  if (input.subscriptionId) {
    const { data, error } = await supabase
      .from("profiles")
      .select("id")
      .eq("polar_subscription_id", input.subscriptionId)
      .maybeSingle();

    if (error) throw new Error(`Profile lookup by subscription ID failed: ${error.message}`);
    if (data?.id) return data.id;
  }

  if (input.polarCustomerId) {
    const { data, error } = await supabase
      .from("profiles")
      .select("id")
      .eq("polar_customer_id", input.polarCustomerId)
      .maybeSingle();

    if (error) throw new Error(`Profile lookup by Polar customer ID failed: ${error.message}`);
    if (data?.id) return data.id;
  }

  if (input.email) {
    const { data, error } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", input.email)
      .maybeSingle();

    if (error) throw new Error(`Profile lookup by email failed: ${error.message}`);
    if (data?.id) return data.id;
  }

  return null;
}

async function activatePlan(data: ReturnType<typeof normalizePolarData>): Promise<void> {
  if (!data.productId) throw new Error("Webhook did not include a product ID.");
  if (!data.subscriptionId) throw new Error("Webhook did not include a subscription ID.");

  const mapping = PRODUCT_MAP.get(data.productId);
  if (!mapping) {
    throw new Error(`Unknown Polar product ID: ${data.productId}`);
  }

  const userId = await resolveUserId(data);
  if (!userId) {
    throw new Error(
      `Could not resolve Supabase user for Polar customer=${data.polarCustomerId ?? "missing"} externalCustomer=${data.externalCustomerId ?? "missing"} email=${data.email ?? "missing"}`,
    );
  }

  const supabase = createServiceSupabaseClient();
  const { data: updated, error } = await supabase
    .from("profiles")
    .update({
      subscription_tier: mapping.tier,
      billing_cadence: mapping.cadence,
      polar_customer_id: data.polarCustomerId,
      polar_subscription_id: data.subscriptionId,
      words_used: 0,
      api_usage_count: 0,
      credits: getPlanStartingCredits(mapping.tier),
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId)
    .select("id, subscription_tier, billing_cadence, polar_subscription_id, words_used, credits")
    .single();

  if (error) throw new Error(`Plan activation DB update failed: ${error.message}`);
  if (!updated?.id) throw new Error(`Plan activation updated no profile rows for user ${userId}.`);
}

async function downgradeToFree(data: ReturnType<typeof normalizePolarData>, reason: string): Promise<void> {
  const userId = await resolveUserId(data);
  if (!userId) {
    throw new Error(
      `Could not resolve Supabase user for ${reason}: Polar customer=${data.polarCustomerId ?? "missing"} externalCustomer=${data.externalCustomerId ?? "missing"} subscription=${data.subscriptionId ?? "missing"} email=${data.email ?? "missing"}`,
    );
  }

  const supabase = createServiceSupabaseClient();
  const { data: updated, error } = await supabase
    .from("profiles")
    .update({
      subscription_tier: "free",
      billing_cadence: "free",
      polar_subscription_id: null,
      words_used: 0,
      api_usage_count: 0,
      credits: getPlanStartingCredits("free"),
      updated_at: new Date().toISOString(),
    })
    .eq("id", userId)
    .select("id, subscription_tier, billing_cadence, polar_subscription_id, words_used, credits")
    .single();

  if (error) throw new Error(`Plan downgrade DB update failed: ${error.message}`);
  if (!updated?.id) throw new Error(`Plan downgrade updated no profile rows for user ${userId}.`);
}

async function revokeRefundedSubscription(data: ReturnType<typeof normalizePolarData>) {
  if (!data.subscriptionId) return;

  try {
    const polar = createPolarClient();
    await polar.subscriptions.revoke({ id: data.subscriptionId });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[polar-webhook] Failed to revoke refunded subscription ${data.subscriptionId}: ${message}`);
  }
}

export async function GET() {
  return NextResponse.json({
    ok: true,
    message: "Polar webhook endpoint is reachable",
    secret_set: !!process.env.POLAR_WEBHOOK_SECRET,
    product_ids_loaded: [...PRODUCT_MAP.keys()].length,
  });
}

export async function POST(request: Request) {
  const secret = process.env.POLAR_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "Webhook secret not configured" }, { status: 500 });
  }

  const rawBody = await request.text();
  const headers: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    headers[key] = value;
  });

  let event: ReturnType<typeof validateEvent>;
  try {
    event = validateEvent(rawBody, headers, secret);
  } catch (error) {
    if (error instanceof WebhookVerificationError) {
      return NextResponse.json({ error: "Invalid webhook signature" }, { status: 403 });
    }
    const message = error instanceof Error ? error.message : "Webhook verification failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  try {
    const data = normalizePolarData((event as { data: PolarRecord }).data, event.type);

    switch (event.type) {
      case "order.paid":
        if (data.subscriptionId) await activatePlan(data);
        break;

      case "subscription.created":
      case "subscription.active":
      case "subscription.updated":
      case "subscription.uncanceled":
        if (data.status === "active" || event.type === "subscription.active" || event.type === "subscription.uncanceled") {
          await activatePlan(data);
        }
        break;

      case "subscription.canceled":
        await downgradeToFree(data, "subscription cancellation");
        break;

      case "subscription.revoked":
      case "subscription.past_due":
        await downgradeToFree(data, event.type);
        break;

      case "order.refunded":
        await downgradeToFree(data, "order refund");
        await revokeRefundedSubscription(data);
        break;

      default:
        break;
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`[polar-webhook] Handler failed: ${message}`);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
