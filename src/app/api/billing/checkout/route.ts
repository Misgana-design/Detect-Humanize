import { NextResponse } from "next/server";
import {
  getPlanDefinition,
  type BillingCadence,
  type BillingTier,
} from "@/lib/billing/plans";
import { createPolarClient, getPolarProductId } from "@/lib/billing/polar";
import { createServerSupabaseClient } from "@/lib/supabase/server";

function getBaseUrl(request: Request) {
  const envUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL;
  if (envUrl) return envUrl;
  return new URL(request.url).origin;
}

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Please sign in to continue." }, { status: 401 });
    }

    const body = (await request.json()) as {
      tier?: BillingTier;
      cadence?: BillingCadence;
    };

    if (!body.tier || !body.cadence) {
      return NextResponse.json(
        { error: "Missing required checkout parameters." },
        { status: 400 },
      );
    }

    const plan = getPlanDefinition(body.tier);

    if (body.tier === "free" || body.cadence === "free") {
      return NextResponse.json(
        { error: "Free plan does not require checkout." },
        { status: 400 },
      );
    }

    if (!plan.supportedCadences.includes(body.cadence)) {
      return NextResponse.json(
        { error: `${plan.name} does not support ${body.cadence} billing.` },
        { status: 400 },
      );
    }

    const productId = getPolarProductId(body.tier, body.cadence);
    if (!productId) {
      return NextResponse.json(
        { error: "Plan is not connected to a Polar product yet." },
        { status: 400 },
      );
    }

    const baseUrl = getBaseUrl(request);
    const polar = createPolarClient();

    const checkout = await polar.checkouts.create({
      products: [productId],
      externalCustomerId: user.id,
      customerEmail: user.email ?? undefined,
      successUrl: `${baseUrl}/dashboard`,
      returnUrl: `${baseUrl}/pricing`,
      metadata: {
        user_id: user.id,
        requested_tier: body.tier,
        requested_cadence: body.cadence,
      },
    });

    return NextResponse.json({ url: checkout.url });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create checkout session.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
