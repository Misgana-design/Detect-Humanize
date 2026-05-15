import { Sidebar } from "@/components/dashboard/Sidebar";
import type { Metadata } from "next";
import { buildMetadata } from "@/lib/seo";

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({
    title: "Dashboard",
    description: "Your Text Humanica dashboard, history, and account usage.",
    path: "/dashboard",
    noIndex: true,
  });
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen bg-white">
      {/* Sidebar — desktop persistent, mobile drawer */}
      <Sidebar />

      {/* Page content */}
      <main className="flex-1 overflow-y-auto bg-slate-50/50">
        {/* pt-14 offsets the fixed mobile top bar; lg:pt-0 removes it on desktop */}
        <div className="mx-auto max-w-7xl px-4 py-6 pt-20 sm:px-6 lg:px-6 lg:pt-8">
          {children}
        </div>
      </main>
    </div>
  );
}
