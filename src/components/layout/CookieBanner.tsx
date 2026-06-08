"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Cookie, Settings, X } from "lucide-react";

type ConsentState = "accepted" | "rejected" | "custom" | null;

const STORAGE_KEY = "th_cookie_consent";

function getStoredConsent(): ConsentState {
  if (typeof window === "undefined") return null;
  return (localStorage.getItem(STORAGE_KEY) as ConsentState) ?? null;
}

export function CookieBanner() {
  const [consent, setConsent] = useState<ConsentState>(null);
  const [showCustomize, setShowCustomize] = useState(false);
  const [analytics, setAnalytics] = useState(true);
  const [marketing, setMarketing] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setConsent(getStoredConsent());
  }, []);

  const save = (value: ConsentState) => {
    localStorage.setItem(STORAGE_KEY, value!);
    setConsent(value);
    setShowCustomize(false);
  };

  const acceptAll = () => save("accepted");
  const rejectNonEssential = () => save("rejected");
  const saveCustom = () => save("custom");

  if (!mounted || consent !== null) return null;

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      aria-modal="false"
      className="fixed bottom-4 right-4 z-50 w-[min(360px,calc(100vw-2rem))]"
    >
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/15">

        {/* ── Main banner ── */}
        {!showCustomize ? (
          <div className="p-5">
            {/* Close button */}
            <div className="mb-3 flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-50">
                  <Cookie className="h-4.5 w-4.5 text-indigo-600" />
                </div>
                <h2 className="text-base font-bold text-slate-900">
                  We value your privacy
                </h2>
              </div>
              <button
                onClick={rejectNonEssential}
                className="shrink-0 rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
                aria-label="Dismiss"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Body text */}
            <p className="text-sm leading-relaxed text-slate-500">
              We use cookies to enhance your experience, analyze site traffic,
              and remember your preferences. By clicking &ldquo;Accept All&rdquo;,
              you consent to our use of cookies. You can customize your
              preferences or learn more in our{" "}
              <Link href="/privacy" className="text-indigo-600 hover:underline">
                Privacy Policy
              </Link>
              .
            </p>

            {/* Buttons */}
            <div className="mt-4 flex flex-col gap-2">
              <button
                onClick={acceptAll}
                className="w-full cursor-pointer rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white shadow-sm shadow-indigo-100 transition hover:bg-indigo-700"
              >
                Accept All
              </button>
              <button
                onClick={rejectNonEssential}
                className="w-full cursor-pointer rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                Necessary Only
              </button>
              <button
                onClick={() => setShowCustomize(true)}
                className="inline-flex w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl px-4 py-2 text-sm font-medium text-slate-500 transition hover:bg-slate-50"
              >
                <Settings className="h-3.5 w-3.5" />
                Customize
              </button>
            </div>
          </div>
        ) : (

          /* ── Customize panel ── */
          <div className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900">
                Cookie Preferences
              </h2>
              <button
                onClick={() => setShowCustomize(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              {/* Essential — always on */}
              <div className="flex items-start justify-between gap-4 rounded-xl border border-slate-100 bg-slate-50 p-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    Essential cookies
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Required for authentication and core functionality. Cannot
                    be disabled.
                  </p>
                </div>
                <div className="shrink-0 rounded-full bg-indigo-600 px-2.5 py-0.5 text-[11px] font-bold text-white">
                  Always on
                </div>
              </div>

              {/* Analytics */}
              <div className="flex items-start justify-between gap-4 rounded-xl border border-slate-100 p-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    Analytics cookies
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Help us understand how you use the app so we can improve it.
                  </p>
                </div>
                <button
                  role="switch"
                  aria-checked={analytics}
                  onClick={() => setAnalytics((v) => !v)}
                  className={`relative h-6 w-11 shrink-0 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-1 ${analytics ? "bg-indigo-600" : "bg-slate-200"}`}
                >
                  <span
                    className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${analytics ? "left-5" : "left-0.5"}`}
                  />
                </button>
              </div>

              {/* Marketing */}
              <div className="flex items-start justify-between gap-4 rounded-xl border border-slate-100 p-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">
                    Marketing cookies
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Used to personalize content and measure campaign
                    effectiveness.
                  </p>
                </div>
                <button
                  role="switch"
                  aria-checked={marketing}
                  onClick={() => setMarketing((v) => !v)}
                  className={`relative h-6 w-11 shrink-0 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-1 ${marketing ? "bg-indigo-600" : "bg-slate-200"}`}
                >
                  <span
                    className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${marketing ? "left-5" : "left-0.5"}`}
                  />
                </button>
              </div>
            </div>

            <div className="mt-4 flex gap-2">
              <button
                onClick={saveCustom}
                className="flex-1 cursor-pointer rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700"
              >
                Save preferences
              </button>
              <button
                onClick={rejectNonEssential}
                className="cursor-pointer rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
              >
                Reject all
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
