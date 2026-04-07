import { Sidebar } from "@/components/dashboard/Sidebar";

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
