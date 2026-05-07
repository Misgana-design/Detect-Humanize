export type BillingTier =
  | "free"
  | "basic"
  | "pro"
  | "unlimited"
  | "enterprise"
  | "pro_weekly";

export type BillingCadence = "free" | "monthly" | "yearly" | "weekly";
export type PricingToggleCadence = "monthly" | "yearly";
export type QuotaPeriod = "month" | "week" | "none";

export interface PlanDefinition {
  tier: BillingTier;
  name: string;
  description: string;
  cta: string;
  href: string;
  featured?: boolean;
  isNew?: boolean;
  supportedCadences: BillingCadence[];
  prices: Partial<Record<BillingCadence, number>>;
  maxWordsPerInput: number | null;
  wordQuota: number | null;
  quotaPeriod: QuotaPeriod;
  features: string[];
  comparison: {
    aiDetection: boolean;
    humanizer: boolean;
    saveReports: boolean;
    apiAccess: boolean;
    teamDashboard: boolean;
  };
}

export const PLAN_ORDER: BillingTier[] = [
  "free",
  "basic",
  "pro",
  "unlimited",
  "enterprise",
  "pro_weekly",
];

export const PLAN_DEFINITIONS: Record<BillingTier, PlanDefinition> = {
  free: {
    tier: "free",
    name: "Free",
    description: "For casual use and trying out",
    cta: "Get started",
    href: "/signup",
    supportedCadences: ["free"],
    prices: { free: 0 },
    maxWordsPerInput: 500,
    wordQuota: 1000,
    quotaPeriod: "month",
    features: [
      "1,000 words/month",
      "Basic detection (Flash model)",
      "Basic humanization (Default tone only)",
      "Last 3 documents history + Comparizon mode",
      "Email support",
    ],
    comparison: {
      aiDetection: true,
      humanizer: true,
      saveReports: true,
      apiAccess: false,
      teamDashboard: false,
    },
  },
  basic: {
    tier: "basic",
    name: "Basic",
    description: "For casual use and trying out",
    cta: "Subscribe",
    href: "/signup",
    supportedCadences: ["monthly", "yearly"],
    prices: { monthly: 4.99, yearly: 1.99 },
    maxWordsPerInput: 500,
    wordQuota: 4000,
    quotaPeriod: "month",
    features: [
      "Bypass all AI detectors including GPTZero",
      "500 words max per input",
      "4000 words per month",
      "Basic AI detection",
      "Limited humanization",
      "All tones",
      "Full dashboard history + Comparizon mode",
      "Re-humanize feature",
      "Copy for Google Docs + PDF export",
      "Plagiarism free",
      "Error free rewriting",
      "Email support",
    ],
    comparison: {
      aiDetection: true,
      humanizer: true,
      saveReports: true,
      apiAccess: false,
      teamDashboard: false,
    },
  },
  pro: {
    tier: "pro",
    name: "Pro",
    description: "For writers and students",
    cta: "Subscribe",
    href: "/signup",
    featured: true,
    supportedCadences: ["monthly", "yearly"],
    prices: { monthly: 18.99, yearly: 8.99 },
    maxWordsPerInput: 1500,
    wordQuota: 20000,
    quotaPeriod: "month",
    features: [
      "Bypass all AI detectors including GPTZero",
      "1500 max per input",
      "20,000 words/month",
      "All tones (casual, academic, professional,...)",
      "Full AI detection + Humanization experience",
      "Full dashboard history + Comparizon mode",
      "Re-humanize feature",
      "Priority support",
      "Copy for Google Docs + PDF export",
      "Error free",
      "Plagiarism-free rewrites",
    ],
    comparison: {
      aiDetection: true,
      humanizer: true,
      saveReports: true,
      apiAccess: true,
      teamDashboard: false,
    },
  },
  unlimited: {
    tier: "unlimited",
    name: "Unlimited",
    description: "For teams and professionals",
    cta: "Subscribe",
    href: "/signup",
    supportedCadences: ["monthly", "yearly"],
    prices: { monthly: 29.99, yearly: 11.99 },
    maxWordsPerInput: 2500,
    wordQuota: null,
    quotaPeriod: "none",
    features: [
      "Bypass all AI detectors including GPTZero",
      "2500 words max per input",
      "Unlimited words/month",
      "Team dashboard",
      "Export & integrations",
      "Dedicated support",
      "Priority speed",
      "Bulk processing",
      "Long text support",
      "Error free",
      "Plagiarism-free rewrites",
    ],
    comparison: {
      aiDetection: true,
      humanizer: true,
      saveReports: true,
      apiAccess: true,
      teamDashboard: true,
    },
  },
  enterprise: {
    tier: "enterprise",
    name: "Enterprise",
    description: "For teams and professionals",
    cta: "Subscribe",
    href: "/signup",
    supportedCadences: ["monthly", "yearly"],
    prices: { monthly: 79.99, yearly: 39.99 },
    maxWordsPerInput: 2500,
    wordQuota: null,
    quotaPeriod: "none",
    features: [
      "Bypass all AI detectors including GPTZero",
      "2500 words max per input",
      "No daily rate limit",
      "Team access (multi-user)",
      "Team dashboard",
      "Export & integrations",
      "Dedicated support",
      "Priority speed",
      "Bulk processing",
      "Long text support",
      "Error free",
      "Plagiarism-free rewrites",
    ],
    comparison: {
      aiDetection: true,
      humanizer: true,
      saveReports: true,
      apiAccess: true,
      teamDashboard: true,
    },
  },
  pro_weekly: {
    tier: "pro_weekly",
    name: "Pro Weekly",
    description: "For writers and students",
    cta: "Subscribe",
    href: "/signup",
    isNew: true,
    supportedCadences: ["weekly"],
    prices: { weekly: 19 },
    maxWordsPerInput: 1000,
    wordQuota: 5000,
    quotaPeriod: "week",
    features: [
      "Bypass all AI detectors including GPTZero",
      "1000 max per input",
      "5,000 words/week",
      "All tones (casual, academic, professional,...)",
      "Full AI detection + Humanization",
      "Full dashboard history + Comparizon mode",
      "Re-humanize feature",
      "Priority support",
      "Copy for Google Docs + PDF export",
      "Error free",
      "Plagiarism-free rewrites",
    ],
    comparison: {
      aiDetection: true,
      humanizer: true,
      saveReports: true,
      apiAccess: true,
      teamDashboard: false,
    },
  },
};

export const COMPARISON_ROWS = [
  { key: "aiDetection", feature: "AI Detection" },
  { key: "humanizer", feature: "Humanizer" },
  { key: "saveReports", feature: "Save reports" },
  { key: "apiAccess", feature: "API access" },
  { key: "teamDashboard", feature: "Team dashboard" },
] as const;

export function getPlanDefinition(tier?: string | null): PlanDefinition {
  if (!tier) return PLAN_DEFINITIONS.free;
  return PLAN_DEFINITIONS[tier as BillingTier] ?? PLAN_DEFINITIONS.free;
}

export function getPlanDefinitions(): PlanDefinition[] {
  return PLAN_ORDER.map((tier) => PLAN_DEFINITIONS[tier]);
}

export function getPlanPrice(
  plan: PlanDefinition,
  cadence: PricingToggleCadence,
): { amount: number; cadence: BillingCadence } {
  if (plan.supportedCadences.includes(cadence)) {
    return {
      amount: plan.prices[cadence] ?? 0,
      cadence,
    };
  }

  const fallbackCadence = plan.supportedCadences[0] ?? "free";
  return {
    amount: plan.prices[fallbackCadence] ?? 0,
    cadence: fallbackCadence,
  };
}

export function getQuotaLabel(plan: PlanDefinition): string {
  if (plan.wordQuota === null) {
    return plan.quotaPeriod === "month" ? "Unlimited words/month" : "Unlimited";
  }

  return `${plan.wordQuota.toLocaleString()} words/${plan.quotaPeriod}`;
}

export function getRemainingWords(
  tier: string | null | undefined,
  wordsUsed: number | null | undefined,
): number | null {
  const plan = getPlanDefinition(tier);

  if (plan.wordQuota === null) return null;
  return Math.max(plan.wordQuota - (wordsUsed ?? 0), 0);
}

export function getPlanStartingCredits(tier?: string | null): number | null {
  return getPlanDefinition(tier).wordQuota;
}

export function getQuotaPeriodLabel(plan: PlanDefinition): string {
  if (plan.quotaPeriod === "week") return "weekly";
  if (plan.quotaPeriod === "month") return "monthly";
  return "ongoing";
}

export function getDisplayTierName(tier?: string | null): string {
  return getPlanDefinition(tier).name;
}
