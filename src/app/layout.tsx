import "./globals.css";
import { Inter } from "next/font/google";
import Providers from "./providers";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { Suspense } from "react";
// import Navbar from "@/components/layout/Navbar";

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          <div className="min-h-screen flex flex-col">
            <Suspense
              fallback={
                <div className="h-16 w-full bg-gray-50 animate-pulse" />
              }
            >
              <Navbar />
            </Suspense>
            <main className="flex-1 container mx-auto px-4 py-8 min-h-screen">
              <Suspense>{children}</Suspense>
            </main>
            <Footer />
          </div>
        </Providers>
      </body>
    </html>
  );
}
