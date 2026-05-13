import "./globals.css";
import { Inter, DM_Sans } from "next/font/google";
import { Suspense } from "react";
import type { Metadata } from "next";
import Providers from "./providers";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { CookieBanner } from "@/components/layout/CookieBanner";
import { StructuredData } from "@/components/seo/StructuredData";
import { buildMetadata, buildOrganizationJsonLd } from "@/lib/seo";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

// Premium brand font — DM Sans: balanced, modern, used by Notion/Loom-style AI startups.
// Excellent readability at all sizes, not squeezed, feels trustworthy and clean.
const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  weight: ["500", "600", "700"],
});

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({
    // POLAR_BACKUP: title: "Undetectable AI Detector & Humanizer"
    title: "AI Detector & Writing Humanizer",
    description:
      // POLAR_BACKUP: "Detect AI-generated writing, humanize AI text, bypass GPTZero-style flags, and manage your writing workflow in one polished AI workspace."
      "Detect AI-generated writing, humanize AI text into natural language, and manage your writing workflow in one polished AI workspace.",
    path: "/",
  });
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${dmSans.variable}`}>
      <body className={inter.className}>
        <StructuredData data={buildOrganizationJsonLd()} />
        <Providers>
          <div className="flex min-h-screen flex-col">
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
