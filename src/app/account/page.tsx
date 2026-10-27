import type { Metadata } from "next";
import { AccountPageClient } from "@/components/account/AccountPageClient";
import { StructuredData } from "@/components/seo/StructuredData";
import { buildBreadcrumbJsonLd, buildMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({
    title: "Manage Account",
    description:
      "Manage your Text Humanica profile: update your display name, Google sign-in identity, password settings, and API key access.",
    path: "/account",
    noIndex: true,
  });
}

export default function AccountPage() {
  return (
    <>
      <StructuredData
        data={buildBreadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Manage Account", path: "/account" },
        ])}
      />
      {/* H1 for SEO — visually hidden, preserves visual design */}
      <h1 className="sr-only">Manage Account</h1>
      <AccountPageClient />
    </>
  );
}
