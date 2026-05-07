/**
 * POST /api/billing/portal
 *
 * Creates a Polar Customer Portal session for the current user and returns
 * the portal URL. The portal lets users cancel, update payment methods,
 * and view invoices — all hosted by Polar.
 */

import { NextResponse } from "next/server";
import { createServerSupabaseClient } from "@/lib/supabase/server";
import { createPolarClient } from "@/lib/billing/polar";

function getBaseUrl(request: Request) {
  const envUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL;
  if (envUrl) return envUrl;
  return new URL(request.url).origin;
}

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Please sign in to continue." }, { status: 401 });
    }

    // Check the user actually has a paid subscription
    const { data: profile } = await supabase
      .from("profiles")
      .select("subscription_tier, polar_customer_id, polar_subscription_id")
      .eq("id", user.id)
      .single();

    if (!profile?.subscription_tier || profile.subscription_tier === "free") {
      return NextResponse.json(
        { error: "No active subscription found." },
        { status: 400 },
      );
    }

    const polar = createPolarClient();
    const baseUrl = getBaseUrl(request);

    // Create a customer portal session using the Supabase user ID as externalCustomerId
    // (this is the same value we set at checkout creation)
    const session = await polar.customerSessions.create({
      externalCustomerId: user.id,
      returnUrl: `${baseUrl}/account`,
    });

    return NextResponse.json({ url: session.customerPortalUrl });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to open customer portal.";
    console.error("[billing/portal] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
