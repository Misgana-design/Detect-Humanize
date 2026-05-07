import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({
    title: "Pricing",
    description:
      "Compare Free, Basic, Pro, Unlimited, Enterprise, and Pro Weekly plans for Text Humanica.",
    path: "/pricing",
  });
}

export default function PricingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
