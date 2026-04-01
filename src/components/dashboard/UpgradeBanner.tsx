import { CreditCard, Sparkles } from "lucide-react";

export function UpgradeBanner() {
  return (
    <div className="bg-linear-to-br from-indigo-50 to-blue-50 border border-indigo-100 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
      <div className="flex items-center gap-4">
        {/* Icon */}
        <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center text-white shadow-md shadow-indigo-100">
          <Sparkles size={24} className="fill-current" />
        </div>

        {/* Text */}
        <div>
          <h3 className="text-sm font-bold text-slate-900">
            You've hit the Free Tier limit!
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Upgrade to Pro to get 1,000 scans per month and access advanced
            humanization.
          </p>
        </div>
      </div>

      {/* Action Button */}
      <a
        href="https://polar.sh/your-checkout-link" // 👈 Swap this with your actual Polar checkout URL
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center justify-center px-5 py-2.5 font-semibold text-white bg-black rounded-xl hover:bg-slate-800 transition-all shadow-md text-xs gap-2 whitespace-nowrap"
      >
        <CreditCard size={14} />
        Upgrade with Polar
      </a>
    </div>
  );
}
