import type { Metadata } from "next";
import { AccountPageClient } from "@/components/account/AccountPageClient";
import { StructuredData } from "@/components/seo/StructuredData";
import { buildBreadcrumbJsonLd, buildMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({
    title: "Manage Account",
    description:
      "Manage your profile details, Google sign-in identity, and password settings.",
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
      <AccountPageClient />
    </>
  );
}
