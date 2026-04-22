"use client";

import { Suspense, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { StatCard } from "@/components/dashboard/StatCard";
import { FileText, Brain, Clock, Zap } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useSuspenseQuery } from "@tanstack/react-query";



// 1. THE SKELETON UI (Masks any layout shifting or loading lag)
function DashboardSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      {/* Header Skeleton */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="h-7 w-32 bg-slate-200 rounded-lg"></div>
          <div className="h-4 w-64 bg-slate-200 rounded-lg"></div>
        </div>
        <div className="h-10 w-36 bg-slate-200 rounded-xl"></div>
      </div>

      {/* Stats Grid Skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white border p-6 rounded-2xl space-y-3">
            <div className="w-8 h-8 bg-slate-100 rounded-lg"></div>
            <div className="h-4 w-20 bg-slate-200 rounded"></div>
            <div className="h-8 w-12 bg-slate-200 rounded"></div>
          </div>
        ))}
      </div>

      {/* Table Skeleton */}
      <div className="bg-white border rounded-2xl overflow-hidden shadow-sm">
        <div className="px-6 py-4 bg-slate-50 border-b">
          <div className="h-5 w-40 bg-slate-200 rounded"></div>
        </div>
        <div className="p-6 space-y-4">
          {[...Array(3)].map((_, i) => (
            <div
              key={i}
              className="flex justify-between items-center border-b pb-4 last:border-0 last:pb-0"
            >
              <div className="space-y-2">
                <div className="h-4 w-40 bg-slate-200 rounded"></div>
                <div className="h-3 w-24 bg-slate-100 rounded"></div>
              </div>
              <div className="h-5 w-16 bg-slate-200 rounded-full"></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  return (
    // We update the fallback to use our brand-new skeleton!
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardContent />
    </Suspense>
  );
}

function DashboardContent() {
  const supabase = createClient();
  const searchParams = useSearchParams();
  const [inputText, setInputText] = useState("");

  // 👉 THE FIX: Track whether the component has successfully mounted on the client
  const [mounted, setMounted] = useState(false);

  const { data: documents } = useSuspenseQuery({
    queryKey: ["dashboard-docs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documents")
        .select(
          `
          *,
          detection_results (ai_score)
        `,
        )
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  // Set mounted to true on the client only
  useEffect(() => {
    setMounted(true);
  }, []);

  const initialText = searchParams.get("text");
  useEffect(() => {
    if (initialText) {
      setInputText(initialText);
    }
  }, [initialText]);

  // 👉 THE FIX (Cont.): If not mounted yet, render the skeleton to avoid server/client mismatch
  if (!mounted) {
    return <DashboardSkeleton />;
  }

  // Pure logic calculations
  const totalDocs = documents.length;
  const totalScore = documents.reduce(
    (acc, doc) => acc + (doc.detection_results?.[0]?.ai_score || 0),
    0,
  );
  const avgScore =
    totalDocs > 0 ? ((totalScore / totalDocs) * 100).toFixed(1) : "0";

  return (
    <div className="space-y-8">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Overview
          </h1>
          <p className="text-slate-500 text-sm">
            Monitor your AI content footprint and recent scans.
          </p>
        </div>
        <Link
          href="/detect"
          className="inline-flex items-center justify-center px-5 py-2.5 font-semibold text-white bg-indigo-600 rounded-xl hover:bg-indigo-700 transition-all shadow-md shadow-indigo-100"
        >
          <Zap className="w-4 h-4 mr-2 fill-current" />
          New Analysis
        </Link>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
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
        <StatCard label="Credits Used" value="120 / 500" icon={Zap} />
      </div>

      {/* Table Section */}
      <div className="bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <h2 className="font-bold text-slate-800">Recent Documents</h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="text-slate-400 text-xs uppercase tracking-wider">
                <th className="px-6 py-4 font-semibold">Document Name</th>
                <th className="px-6 py-4 font-semibold">AI Probability</th>
                <th className="px-6 py-4 font-semibold">Date</th>
                <th className="px-6 py-4 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {documents.map((doc) => {
                const rawScore = doc.detection_results?.[0]?.ai_score || 0;
                const scorePercentage = Math.round(rawScore * 100);

                return (
                  <tr
                    key={doc.id}
                    className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                  >
                    <td className="px-6 py-4">
                      <span className="text-sm font-medium text-slate-900 group-hover:text-indigo-600 transition-colors">
                        {doc.title || "Untitled Scan"}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
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
                      <span className="px-2 py-1 bg-emerald-50 text-emerald-700 rounded-md font-medium border border-emerald-100">
                        Completed
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Empty State */}
        {documents.length === 0 && (
          <div className="py-20 flex flex-col items-center justify-center text-center space-y-4">
            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center">
              <FileText className="text-slate-300 w-8 h-8" />
            </div>
            <div className="space-y-1">
              <p className="font-semibold text-slate-900">No documents found</p>
              <p className="text-sm text-slate-500">
                Create your first analysis to see results here.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
