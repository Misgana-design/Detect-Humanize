"use client";

import { Suspense } from "react";
import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Brain, Clock, FileText, Lock, Zap } from "lucide-react";
import { StatCard } from "@/components/dashboard/StatCard";
import { createClient } from "@/lib/supabase/client";
import { useProfile } from "@/hooks/userProfile";

type DashboardDocument = {
  id: string;
  title: string | null;
  created_at: string;
  detection_results?: Array<{ ai_score: number | null }> | null;
};

function DashboardSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div className="space-y-2">
          <div className="h-7 w-32 rounded-lg bg-slate-200" />
          <div className="h-4 w-64 rounded-lg bg-slate-200" />
        </div>
        <div className="h-10 w-36 rounded-xl bg-slate-200" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
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
            <div
              key={i}
              className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0"
            >
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
        .select(
          `
          id,
          title,
          created_at,
          detection_results (ai_score)
        `,
        )
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data ?? []) as DashboardDocument[];
    },
  });

  const totalDocs = documents.length;
  const displayedDocs = isFree ? documents.slice(0, FREE_DOC_LIMIT) : documents;
  const totalScore = documents.reduce(
    (acc, doc) => acc + (doc.detection_results?.[0]?.ai_score || 0),
    0,
  );
  const avgScore =
    totalDocs > 0 ? ((totalScore / totalDocs) * 100).toFixed(1) : "0";

  return (
    <div className="space-y-8">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Overview
          </h1>
          <p className="text-sm text-slate-500">
            Monitor your AI content footprint and recent scans.
          </p>
        </div>
        <Link
          href="/detect"
          className="inline-flex items-center justify-center rounded-xl bg-indigo-600 px-5 py-2.5 font-semibold text-white shadow-md shadow-indigo-100 transition-all hover:bg-indigo-700"
        >
          <Zap className="mr-2 h-4 w-4 fill-current" />
          New Analysis
        </Link>
      </div>

      <section className="rounded-3xl border border-indigo-100 bg-gradient-to-r from-indigo-600 via-indigo-500 to-sky-500 p-6 text-white shadow-xl shadow-indigo-100">
        <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-100">
              Productivity Snapshot
            </p>
            <h2 className="mt-2 text-2xl font-bold">
              Keep your content workflow clean and submission-ready
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-indigo-100">
              Review detection patterns, keep rewrites organized, and move quickly
              between analyze and humanize actions from one dashboard.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-2xl bg-white/10 px-4 py-3">
              <p className="text-indigo-100">Documents</p>
              <p className="text-xl font-bold">{totalDocs}</p>
            </div>
            <div className="rounded-2xl bg-white/10 px-4 py-3">
              <p className="text-indigo-100">Avg Score</p>
              <p className="text-xl font-bold">{avgScore}%</p>
            </div>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Scans"
          value={totalDocs.toString()}
          icon={FileText}
          trend="+4%"
        />
        <StatCard
          label="Avg AI Score"
          value={`${avgScore}%`}
          icon={Brain}
          trend="-2%"
        />
        <StatCard label="Recent Activity" value="Active" icon={Clock} />
        <StatCard label="Detector Status" value="Ready" icon={Zap} />
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 bg-slate-50/50 px-6 py-4">
          <h2 className="font-bold text-slate-800">Recent Documents</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="text-xs uppercase tracking-wider text-slate-400">
                <th className="px-6 py-4 font-semibold">Document Name</th>
                <th className="px-6 py-4 font-semibold">AI Probability</th>
                <th className="px-6 py-4 font-semibold">Date</th>
                <th className="px-6 py-4 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {displayedDocs.map((doc) => {
                const rawScore = doc.detection_results?.[0]?.ai_score || 0;
                const scorePercentage = Math.round(rawScore * 100);

                return (
                  <tr
                    key={doc.id}
                    className="group cursor-pointer transition-colors hover:bg-slate-50/80"
                  >
                    <td className="px-6 py-4">
                      <span className="text-sm font-medium text-slate-900 transition-colors group-hover:text-indigo-600">
                        {doc.title || "Untitled Scan"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full bg-rose-500"
                            style={{ width: `${scorePercentage}%` }}
                          />
                        </div>
                        <span className="text-xs font-bold text-slate-600">
                          {scorePercentage}%
                        </span>
                      </div>
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

        {documents.length === 0 && (
          <div className="flex flex-col items-center justify-center space-y-4 py-20 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-50">
              <FileText className="h-8 w-8 text-slate-300" />
            </div>
            <div className="space-y-1">
              <p className="font-semibold text-slate-900">No documents found</p>
              <p className="text-sm text-slate-500">
                Create your first analysis to see results here.
              </p>
            </div>
          </div>
        )}

        {isFree && documents.length > FREE_DOC_LIMIT && (
          <div className="border-t border-slate-100 bg-indigo-50/50 px-6 py-4">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <Lock className="h-4 w-4 text-indigo-400" />
                <p className="text-sm text-slate-600">
                  <span className="font-semibold">{documents.length - FREE_DOC_LIMIT} more document{documents.length - FREE_DOC_LIMIT !== 1 ? "s" : ""}</span> hidden on the free plan.
                </p>
              </div>
              <Link
                href="/pricing"
                className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white transition hover:bg-indigo-700"
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
