/**
 * Back-to-School Sale configuration.
 *
 * To activate the sale:
 *   1. Set NEXT_PUBLIC_SALE_END_DATE to an ISO-8601 timestamp, e.g.
 *      NEXT_PUBLIC_SALE_END_DATE=2026-09-30T23:59:59Z
 *   2. Create a 50 % discount in the Polar dashboard and set:
 *      POLAR_DISCOUNT_ID=<polar-discount-uuid>
 *
 * To deactivate: remove (or leave blank) NEXT_PUBLIC_SALE_END_DATE.
 */

/** ISO timestamp exposed to the browser — drives both banners. */
const SALE_END_RAW = process.env.NEXT_PUBLIC_SALE_END_DATE ?? "";

/**
 * The moment the sale expires.
 * Returns `null` when the env var is absent or unparseable (sale is off).
 */
export function getSaleEndDate(): Date | null {
  if (!SALE_END_RAW) return null;
  const d = new Date(SALE_END_RAW);
  return isNaN(d.getTime()) ? null : d;
}

/** True while the current wall-clock time is before `getSaleEndDate()`. */
export function isSaleActive(): boolean {
  const end = getSaleEndDate();
  return end !== null && Date.now() < end.getTime();
}

/** Polar discount UUID — only used server-side in the checkout route. */
export function getPolarDiscountId(): string | undefined {
  return process.env.POLAR_DISCOUNT_ID || undefined;
}
