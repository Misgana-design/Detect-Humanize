"use client";

import { Suspense } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Clock, FileText, Lock, Sparkles, Zap } from "lucide-react";
import { StatCard } from "@/components/dashboard/StatCard";
import { createClient } from "@/lib/supabase/client";
import { useProfile } from "@/hooks/userProfile";

type DashboardDocument = {
  id: string;
  title: string | null;
  created_at: string;
};

function DashboardSkeleton() {
  return (
    <div className="animate-pulse space-y-8">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div className="space-y-2">
          <div className="h-7 w-32 rounded-lg bg-slate-200" />
          <div className="h-4 w-64 rounded-lg bg-slate-200" />
        </div>
        <div className="h-10 w-36 rounded-xl bg-slate-200" />
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="space-y-3 rounded-2xl border bg-white p-6">
            <div className="h-8 w-8 rounded-lg bg-slate-100" />
            <div className="h-4 w-20 rounded bg-slate-200" />
            <div className="h-8 w-12 rounded bg-slate-200" />
          </div>
        ))}
      </div>
      <div className="overflow-hidden rounded-2xl border bg-white shadow-sm">
        <div className="border-b bg-slate-50 px-6 py-4">
          <div className="h-5 w-40 rounded bg-slate-200" />
        </div>
        <div className="space-y-4 p-6">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
              <div className="space-y-2">
                <div className="h-4 w-40 rounded bg-slate-200" />
                <div className="h-3 w-24 rounded bg-slate-100" />
              </div>
              <div className="h-5 w-16 rounded-full bg-slate-200" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardContent />
    </Suspense>
  );
}

function DashboardContent() {
  const supabase = createClient();
  const { data: profile } = useProfile();
  const isFree = !profile?.subscription_tier || profile.subscription_tier === "free";
  const FREE_DOC_LIMIT = 3;

  const { data: documents } = useSuspenseQuery<DashboardDocument[]>({
    queryKey: ["dashboard-docs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documents")
        .select(`id, title, created_at`)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as DashboardDocument[];
    },
  });

  const totalDocs = documents.length;
  const displayedDocs = isFree ? documents.slice(0, FREE_DOC_LIMIT) : documents;

  return (
    <div className="space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900 sm:text-2xl">
            Overview
          </h1>
          <p className="text-sm text-slate-500">
            Monitor your writing activity and recent documents.
          </p>
        </div>
        <Link
          href="/#humanizer"
          className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-100 transition-all hover:bg-indigo-700"
        >
          <Sparkles className="mr-2 h-4 w-4" />
          New Humanization
        </Link>
      </div>

      {/* Banner */}
      <section className="rounded-3xl border border-indigo-100 bg-gradient-to-r from-indigo-600 via-indigo-500 to-sky-500 p-5 text-white shadow-xl shadow-indigo-100 sm:p-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-100">
              Productivity Snapshot
            </p>
            <h2 className="mt-2 text-lg font-bold sm:text-2xl">
              Keep your content workflow clean and submission-ready
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-indigo-100">
              Keep rewrites organized and move quickly from saved drafts back
              into the humanizer.
            </p>
          </div>
          <div className="rounded-2xl bg-white/10 px-4 py-3 text-sm sm:shrink-0">
              <p className="text-indigo-100">Documents</p>
              <p className="text-xl font-bold">{totalDocs}</p>
            </div>
        </div>
      </section>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-3">
        <StatCard label="Total Documents"  value={totalDocs.toString()} icon={FileText} />
        <StatCard label="Recent Activity"  value="Active"               icon={Clock} />
        <StatCard label="Humanizer Status" value="Ready"                icon={Zap} />
      </div>

      {/* Recent documents */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 bg-slate-50/50 px-4 py-4 sm:px-6">
          <h2 className="font-bold text-slate-800">Recent Documents</h2>
        </div>

        {/* Desktop table — hidden on mobile */}
        <div className="hidden overflow-x-auto sm:block">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="text-xs uppercase tracking-wider text-slate-400">
                <th className="px-6 py-4 font-semibold">Document Name</th>
                <th className="px-6 py-4 font-semibold">Date</th>
                <th className="px-6 py-4 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayedDocs.map((doc) => {
                return (
                  <tr key={doc.id} className="group cursor-pointer transition-colors hover:bg-slate-50/80">
                    <td className="px-6 py-4">
                      <span className="text-sm font-medium text-slate-900 transition-colors group-hover:text-indigo-600">
                        {doc.title || "Untitled Document"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs text-slate-500">
                      {formatDistanceToNow(new Date(doc.created_at))} ago
                    </td>
                    <td className="px-6 py-4 text-xs">
                      <span className="rounded-md border border-emerald-100 bg-emerald-50 px-2 py-1 font-medium text-emerald-700">
                        Completed
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Mobile card list — shown only on mobile */}
        <div className="divide-y divide-slate-100 sm:hidden">
          {displayedDocs.map((doc) => {
            return (
              <div key={doc.id} className="flex items-center justify-between gap-3 px-4 py-4">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-900">
                    {doc.title || "Untitled Document"}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-400">
                    {formatDistanceToNow(new Date(doc.created_at))} ago
                  </p>
                </div>
                <span className="rounded-md border border-emerald-100 bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                  Completed
                </span>
              </div>
            );
          })}
        </div>

        {documents.length === 0 && (
          <div className="flex flex-col items-center justify-center space-y-4 py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-50">
              <FileText className="h-8 w-8 text-slate-300" />
            </div>
            <div className="space-y-1">
              <p className="font-semibold text-slate-900">No documents found</p>
              <p className="text-sm text-slate-500">
                Humanize your first draft to see results here.
              </p>
            </div>
          </div>
        )}

        {isFree && documents.length > FREE_DOC_LIMIT && (
          <div className="border-t border-slate-100 bg-indigo-50/50 px-4 py-4 sm:px-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 shrink-0 text-indigo-400" />
                <p className="text-sm text-slate-600">
                  <span className="font-semibold">
                    {documents.length - FREE_DOC_LIMIT} more document
                    {documents.length - FREE_DOC_LIMIT !== 1 ? "s" : ""}
                  </span>{" "}
                  hidden on the free plan.
                </p>
              </div>
              <Link
                href="/pricing"
                className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-indigo-700"
              >
                Upgrade to see all
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
