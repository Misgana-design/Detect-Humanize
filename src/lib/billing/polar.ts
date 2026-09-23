import { Polar } from "@polar-sh/sdk";
import type { BillingCadence, BillingTier } from "./plans";

type PolarProductMap = Record<string, string>;

const productMap: PolarProductMap = {
  basic_monthly:    process.env.POLAR_PRODUCT_BASIC_MONTHLY_ID     || "",
  basic_yearly:     process.env.POLAR_PRODUCT_BASIC_YEARLY_ID      || "",
  pro_monthly:      process.env.POLAR_PRODUCT_PRO_MONTHLY_ID       || "",
  pro_yearly:       process.env.POLAR_PRODUCT_PRO_YEARLY_ID        || "",
  ultra_monthly:    process.env.POLAR_PRODUCT_ULTRA_MONTHLY_ID     || "",
  ultra_yearly:     process.env.POLAR_PRODUCT_ULTRA_YEARLY_ID      || "",
  // Pro Weekly: tier="pro_weekly", cadence="weekly" → key="pro_weekly_weekly"
  pro_weekly_weekly: process.env.POLAR_PRODUCT_PRO_WEEKLY_ID       || "",
};

// One-time credit packs (single-purchase Polar products).
const creditsProductMap: Record<string, string> = {
  "5000":  process.env.POLAR_CREDITS_5000_PRODUCT_ID  || "",
  "20000": process.env.POLAR_CREDITS_20000_PRODUCT_ID || "",
  "45000": process.env.POLAR_CREDITS_45000_PRODUCT_ID || "",
};

export function getPolarProductId(tier: BillingTier, cadence: BillingCadence) {
  const key = `${tier}_${cadence}`;
  return productMap[key] || null;
}

export function getCreditPackProductId(packKey: string) {
  return creditsProductMap[packKey] || null;
}

export function createPolarClient() {
  const accessToken = process.env.POLAR_ACCESS_TOKEN;
  if (!accessToken) {
    throw new Error("POLAR_ACCESS_TOKEN is missing.");
  }

  const server = process.env.POLAR_SERVER === "sandbox" ? "sandbox" : "production";

  return new Polar({
    accessToken,
    server,
  });
}
