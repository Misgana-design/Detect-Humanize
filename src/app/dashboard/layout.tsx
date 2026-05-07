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
      {/* 1. The Sidebar (Persistent) */}
      <Sidebar />

      {/* 2. The Page Content (Changes based on URL) */}
      <main className="flex-1 overflow-y-auto bg-slate-50/50">
        <div className="max-w-7xl mx-auto py-8 px-6">{children}</div>
      </main>
    </div>
  );
}
