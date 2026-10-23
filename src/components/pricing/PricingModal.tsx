"use client";

import { useEffect, useCallback } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { X, Zap } from "lucide-react";
import { PricingCardsSection } from "@/components/pricing/PricingCardsSection";

interface PricingModalProps {
  onClose: () => void;
}

export function PricingModal({ onClose }: PricingModalProps) {
  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  // Prevent body scroll while modal is open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/60 px-4 py-8 backdrop-blur-sm"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Pricing plans"
    >
      {/* Panel — stop click propagation so clicking inside doesn't close */}
      <div
        className="relative mx-auto w-full max-w-5xl rounded-2xl bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header bar */}
        <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-indigo-600" />
            <p className="text-base font-bold text-slate-900">
              Welcome! Unlock the full experience
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Dismiss pricing"
            className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 hover:cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Pricing cards */}
        <div className="overflow-y-auto px-6 py-8">
          <PricingCardsSection headingLevel="h2" />
        </div>

        {/* Footer dismiss */}
        <div className="border-t border-slate-100 px-6 py-4 text-center">
          <button
            onClick={onClose}
            className="text-sm text-slate-400 underline-offset-2 hover:text-slate-600 hover:underline hover:cursor-pointer"
          >
            Continue with the free plan for now
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Reads the `?new_signup=1` query param and shows the pricing modal once.
 * Place this inside the dashboard layout so it appears on first redirect after signup.
 */
export function NewSignupPricingModal() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const isNewSignup = searchParams.get("new_signup") === "1";

  const handleClose = useCallback(() => {
    // Strip the param from the URL without a full navigation
    const params = new URLSearchParams(searchParams.toString());
    params.delete("new_signup");
    const newUrl = params.size > 0 ? `${pathname}?${params.toString()}` : pathname;
    router.replace(newUrl, { scroll: false });
  }, [router, pathname, searchParams]);

  if (!isNewSignup) return null;

  return <PricingModal onClose={handleClose} />;
}
