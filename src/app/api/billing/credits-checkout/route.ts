import { NextResponse } from "next/server";
import { getCreditPack } from "@/lib/billing/credits";
import { createPolarClient, getCreditPackProductId } from "@/lib/billing/polar";
import { createServerSupabaseClient } from "@/lib/supabase/server";

function getBaseUrl(request: Request) {
  const envUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_APP_URL;
  if (envUrl) return envUrl;
  return new URL(request.url).origin;
}

/**
 * POST /api/billing/credits-checkout
 *
 * Starts a Polar checkout for a one-time credit pack.
 * Restricted to signed-in paid subscribers — free users are
 * funneled to plan upgrades instead.
 */
export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json(
        { error: "Please sign in to continue." },
        { status: 401 },
      );
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("subscription_tier")
      .eq("id", user.id)
      .single();

    const isPaid =
      profile?.subscription_tier && profile.subscription_tier !== "free";

    if (!isPaid) {
      return NextResponse.json(
        {
          error:
            "Credit packs are available with a paid plan. Upgrade your plan to unlock them.",
        },
        { status: 403 },
      );
    }

    const body = (await request.json()) as { pack?: string };
    const pack = getCreditPack(body.pack ?? "");
    if (!pack) {
      return NextResponse.json(
        { error: "Unknown credit pack." },
        { status: 400 },
      );
    }

    const productId = getCreditPackProductId(pack.key);
    if (!productId) {
      return NextResponse.json(
        { error: "This credit pack is not connected to Polar yet." },
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
      returnUrl: `${baseUrl}/dashboard`,
      metadata: {
        user_id: user.id,
        credit_pack: pack.key,
        credit_words: pack.words,
      },
    });

    return NextResponse.json({ url: checkout.url });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create checkout session.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}