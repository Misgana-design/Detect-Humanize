// src/components/dashboard/StatCard.tsx
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  trend?: string;
}

export function StatCard({ label, value, icon: Icon, trend }: StatCardProps) {
  return (
    <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm hover:border-indigo-100 transition-colors">
      <div className="flex items-center justify-between mb-4">
        <div className="p-2.5 bg-indigo-50 rounded-xl">
          <Icon className="w-5 h-5 text-indigo-600" />
        </div>
        {trend && (
          <span
            className={`text-xs font-bold px-2 py-1 rounded-lg ${
              trend.startsWith("+")
                ? "bg-emerald-50 text-emerald-600"
                : "bg-rose-50 text-rose-600"
            }`}
          >
            {trend}
          </span>
        )}
      </div>
      <p className="text-sm font-medium text-slate-500">{label}</p>
      <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>
    </div>
  );
}
