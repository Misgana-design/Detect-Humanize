import "./globals.css";
import { Suspense } from "react";
import type { Metadata } from "next";
import Providers from "./providers";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { CookieBanner } from "@/components/layout/CookieBanner";
import SaleBanner from "@/components/layout/SaleBanner";
import { StructuredData } from "@/components/seo/StructuredData";
import { GoogleAnalytics } from "@/components/analytics/GoogleAnalytics";
import { buildMetadata, buildOrganizationJsonLd } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({
    title: "AI Humanizer — Rewrite AI Text Naturally",
    description:
      "Humanize AI text, bypass GPTZero-style flags, and manage your entire writing workflow in one polished AI workspace. Free plan available, no credit card required.",
    path: "/",
  });
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@500;600;700&family=Inter:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <GoogleAnalytics />
        <StructuredData data={buildOrganizationJsonLd()} />
        <Providers>
          <div className="flex min-h-screen flex-col">
            <SaleBanner />
            <Suspense fallback={<div className="h-16 w-full animate-pulse bg-gray-50" />}>
              <Navbar />
            </Suspense>
            <main className="container mx-auto min-h-screen flex-1 px-4 py-8">
              <Suspense>{children}</Suspense>
            </main>
            <Footer />
            <CookieBanner />
          </div>
        </Providers>
      </body>
    </html>
  );
}
