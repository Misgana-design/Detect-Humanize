import { Polar } from "@polar-sh/sdk";
import type { BillingCadence, BillingTier } from "./plans";

type PolarProductMap = Record<string, string>;

const productMap: PolarProductMap = {
  basic_monthly:    process.env.POLAR_PRODUCT_BASIC_MONTHLY_ID     || "",
  basic_yearly:     process.env.POLAR_PRODUCT_BASIC_YEARLY_ID      || "",
  pro_monthly:      process.env.POLAR_PRODUCT_PRO_MONTHLY_ID       || "",
  pro_yearly:       process.env.POLAR_PRODUCT_PRO_YEARLY_ID        || "",
  unlimited_monthly:process.env.POLAR_PRODUCT_UNLIMITED_MONTHLY_ID || "",
  unlimited_yearly: process.env.POLAR_PRODUCT_UNLIMITED_YEARLY_ID  || "",
  enterprise_monthly:process.env.POLAR_PRODUCT_ENTERPRISE_MONTHLY_ID || "",
  enterprise_yearly: process.env.POLAR_PRODUCT_ENTERPRISE_YEARLY_ID  || "",
  // Pro Weekly: tier="pro_weekly", cadence="weekly" → key="pro_weekly_weekly"
  pro_weekly_weekly: process.env.POLAR_PRODUCT_PRO_WEEKLY_ID       || "",
};

export function getPolarProductId(tier: BillingTier, cadence: BillingCadence) {
  const key = `${tier}_${cadence}`;
  return productMap[key] || null;
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
