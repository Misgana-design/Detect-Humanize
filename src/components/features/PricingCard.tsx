import { Button } from "../ui/Button";
import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

export default function PricingPage() {
  return (
    <div className="py-20">
      <div className="text-center mb-16 space-y-4">
        <h1 className="text-4xl font-extrabold tracking-tight">
          Simple, Transparent Pricing
        </h1>
        <p className="text-slate-500">
          Choose the plan that's right for your content needs.
        </p>
      </div>

      <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto px-4">
        <PlanCard
          title="Free"
          price="0"
          features={[
            "500 words / month",
            "Basic Detection",
            "Community Support",
          ]}
        />
        <PlanCard
          title="Pro"
          price="29"
          highlight
          features={[
            "Unlimited Words",
            "Advanced Humanizer",
            "Bulk Uploads",
            "API Access",
            "Priority Support",
          ]}
        />
        <PlanCard
          title="Team"
          price="99"
          features={[
            "5 Seats Included",
            "Organization Dashboard",
            "SSO Authentication",
          ]}
        />
      </div>
    </div>
  );
}

function PlanCard({ title, price, features, highlight }: any) {
  return (
    <div
      className={cn(
        "p-8 rounded-3xl border transition-all",
        highlight
          ? "bg-slate-900 text-white shadow-2xl scale-105 border-slate-800"
          : "bg-white border-slate-200 text-slate-900",
      )}
    >
      <h3 className="text-lg font-bold mb-2">{title}</h3>
      <div className="flex items-baseline gap-1 mb-6">
        <span className="text-4xl font-bold">${price}</span>
        <span className={highlight ? "text-slate-400" : "text-slate-500"}>
          /mo
        </span>
      </div>
      <ul className="space-y-4 mb-8">
        {features.map((f: string) => (
          <li key={f} className="flex items-center gap-3 text-sm">
            <CheckCircle2
              className={cn(
                "w-5 h-5",
                highlight ? "text-indigo-400" : "text-indigo-600",
              )}
            />
            {f}
          </li>
        ))}
      </ul>
      <Button variant={highlight ? "primary" : "secondary"} className="w-full">
        Choose {title}
      </Button>
    </div>
  );
}
