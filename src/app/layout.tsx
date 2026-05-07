import "./globals.css";
import { Inter, Syne } from "next/font/google";
import { Suspense } from "react";
import type { Metadata } from "next";
import Providers from "./providers";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { CookieBanner } from "@/components/layout/CookieBanner";
import { StructuredData } from "@/components/seo/StructuredData";
import { buildMetadata, buildOrganizationJsonLd } from "@/lib/seo";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

// Premium brand font — Syne: geometric, elegant, used by Linear/Framer-style AI startups
const syne = Syne({
  subsets: ["latin"],
  variable: "--font-syne",
  weight: ["600", "700", "800"],
});

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({
    title: "AI Detector & Humanizer",
    description:
      "Detect AI-generated writing, humanize robotic drafts, and manage your workflow in one polished writing workspace.",
    path: "/",
  });
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${syne.variable}`}>
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
