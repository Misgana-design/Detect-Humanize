import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({
    title: "Pricing for AI Detection & Humanization",
    description:
      // POLAR_BACKUP: "Compare Free, Basic, Pro, Pro Weekly, Unlimited, and Enterprise plans for AI detection, AI humanization, GPTZero bypass workflows, and team writing tools."
      "Compare Free, Basic, Pro, Pro Weekly, Unlimited, and Enterprise plans for AI detection, AI humanization, and team writing tools.",
    path: "/pricing",
    keywords: [
      "AI humanizer pricing",
      "AI detector pricing",
      // POLAR_BACKUP: "GPTZero bypass plans", "undetectable AI subscription"
      "writing assistant plans",
      "AI writing tool subscription",
    ],
  });
}

export default function PricingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
