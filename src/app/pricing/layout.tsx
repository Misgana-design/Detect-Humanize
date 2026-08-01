import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({
    title: "Pricing for AI Humanization",
    description:
      "Compare Free, Basic, Pro, Ultra, and Pro Weekly plans for AI humanization, GPTZero bypass workflows, and team writing tools.",
    path: "/pricing",
    keywords: [
      "AI humanizer pricing",
      "GPTZero bypass plans",
      "undetectable AI subscription",
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
