"use client";

import { useState } from "react";
import {
  AlertCircle,
  Camera,
  CheckCircle2,
  CreditCard,
  ExternalLink,
  KeyRound,
  Loader2,
  Save,
  Sparkles,
  UserCircle2,
  Zap,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { getPlanDefinition, getRemainingWords } from "@/lib/billing/plans";

type AccountProfile = {
  id: string;
  full_name: string | null;
  email: string | null;
  avatar_url: string | null;
  subscription_tier: string | null;
  billing_cadence: string | null;
  words_used: number | null;
  polar_subscription_id: string | null;
};

type AuthUser = {
  id: string;
  email: string | undefined;
  provider: string;
  googleAvatarUrl: string | null;
};

export function AccountPageClient() {
  const supabase = createClient();
  const queryClient = useQueryClient();
  const [passwordMessage, setPasswordMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [profileMessage, setProfileMessage] = useState<string | null>(null);

  // Fetch both the profile row and the auth user (for Google avatar + provider)
  const { data: account } = useQuery<AccountProfile | null>({
    queryKey: ["account-profile"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, email, avatar_url, subscription_tier, billing_cadence, words_used, polar_subscription_id")
        .eq("id", user.id)
        .single();
      if (error) throw error;
      return data as AccountProfile;
    },
  });

  const { data: authUser } = useQuery<AuthUser | null>({
    queryKey: ["auth-user-meta"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      const identities = user.identities ?? [];
      const isGoogle = identities.some((i) => i.provider === "google");
      return {
        id: user.id,
        email: user.email,
        provider: isGoogle ? "google" : "email",
        googleAvatarUrl:
          user.user_metadata?.avatar_url ||
          user.user_metadata?.picture ||
          null,
      };
    },
  });

  const { mutate: saveProfile, isPending: isSavingProfile } = useMutation({
    mutationFn: async (payload: { full_name: string; avatar_url: string | null }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase.from("profiles").update(payload).eq("id", user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      setProfileMessage("Profile updated.");
      queryClient.invalidateQueries({ queryKey: ["account-profile"] });
      queryClient.invalidateQueries({ queryKey: ["user-profile"] });
    },
  });

  const { mutate: updatePassword, isPending: isUpdatingPassword } = useMutation({
    mutationFn: async (password: string) => {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
    },
    onSuccess: () => setPasswordMessage({ ok: true, text: "Password updated successfully." }),
    onError: (err) => setPasswordMessage({ ok: false, text: err instanceof Error ? err.message : "Failed to update password." }),
  });

  // Resolve the best avatar: Google OAuth avatar takes priority, then profile row
  const resolvedAvatar =
    authUser?.googleAvatarUrl ||
    account?.avatar_url ||
    null;

  const plan = getPlanDefinition(account?.subscription_tier);
  const wordsUsed = account?.words_used ?? 0;
  const remaining = getRemainingWords(account?.subscription_tier, wordsUsed);
  const usagePct = plan.wordQuota
    ? Math.min((wordsUsed / plan.wordQuota) * 100, 100)
    : 0;

  const isGoogleUser = authUser?.provider === "google";

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <header className="mb-10">
        <p className="text-sm font-semibold uppercase tracking-[0.2em] text-indigo-600">
          Manage account
        </p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight text-slate-900">
          Your profile and settings
        </h1>
        <p className="mt-4 max-w-2xl text-base text-slate-600">
          {isGoogleUser
            ? "You signed in with Google. Your profile picture and email are managed by Google."
            : "Manage your profile details and update your password below."}
        </p>
      </header>

      <div className="grid gap-8 lg:grid-cols-[1fr_1.4fr]">
        {/* Left column — profile card + subscription */}
        <div className="space-y-6">
          {/* Profile card */}
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col items-center text-center">
              {resolvedAvatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={resolvedAvatar}
                  alt={account?.full_name || "Profile picture"}
                  className="h-24 w-24 rounded-full object-cover ring-4 ring-indigo-100"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="flex h-24 w-24 items-center justify-center rounded-full bg-indigo-600 text-3xl font-bold text-white ring-4 ring-indigo-100">
                  {(account?.full_name || account?.email || "U").charAt(0).toUpperCase()}
                </div>
              )}

              <h2 className="mt-4 text-xl font-bold text-slate-900">
                {account?.full_name || "Your account"}
              </h2>
              <p className="mt-1 text-sm text-slate-500">{account?.email}</p>

              {isGoogleUser && (
                <div className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                  <svg width="14" height="14" viewBox="0 0 48 48" aria-hidden="true">
                    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.6 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12S17.4 12 24 12c3 0 5.7 1.1 7.8 2.9l5.7-5.7C34.1 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
                    <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15 18.9 12 24 12c3 0 5.7 1.1 7.8 2.9l5.7-5.7C34.1 6.1 29.3 4 24 4c-7.7 0-14.4 4.3-17.7 10.7z" />
                    <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35 26.8 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.5 16.2 44 24 44z" />
                    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-1 2.8-2.9 5-5.1 6.5l6.2 5.2C39.7 36.5 44 31 44 24c0-1.3-.1-2.4-.4-3.5z" />
                  </svg>
                  Signed in with Google
                </div>
              )}
            </div>
          </section>

          {/* Subscription card */}
          <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <CreditCard className="h-5 w-5 text-indigo-600" />
              <h2 className="text-lg font-semibold text-slate-900">Subscription</h2>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400">Current plan</p>
                <p className="mt-1 text-xl font-bold text-slate-900">{plan.name}</p>
                {account?.billing_cadence && account.billing_cadence !== "free" && (
                  <p className="text-xs capitalize text-slate-500">{account.billing_cadence} billing</p>
                )}
              </div>
              <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${plan.tier === "free" ? "bg-slate-100" : "bg-indigo-600"}`}>
                {plan.tier === "free"
                  ? <Zap className="h-5 w-5 text-slate-400" />
                  : <Sparkles className="h-5 w-5 text-white" />
                }
              </div>
            </div>

            {/* Word usage */}
            <div className="mt-5">
              <div className="mb-1.5 flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-600">Word usage</span>
                <span className="text-slate-500">
                  {plan.wordQuota === null
                    ? `${wordsUsed.toLocaleString()} used`
                    : `${wordsUsed.toLocaleString()} / ${plan.wordQuota.toLocaleString()}`}
                </span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${usagePct > 80 ? "bg-rose-500" : "bg-indigo-600"}`}
                  style={{ width: `${usagePct}%` }}
                />
              </div>
              {remaining !== null && (
                <p className="mt-1.5 text-xs text-slate-500">
                  <span className={`font-semibold ${remaining < 200 ? "text-rose-600" : "text-slate-700"}`}>
                    {remaining.toLocaleString()} words
                  </span>{" "}
                  remaining this {plan.quotaPeriod}
                </p>
              )}
            </div>

            {plan.tier === "free" ? (
              <Link
                href="/pricing"
                className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-bold text-white transition hover:bg-indigo-700"
              >
                <Sparkles className="h-4 w-4" />
                Upgrade plan
              </Link>
            ) : (
              <SubscriptionActions />
            )}
          </section>
        </div>

        {/* Right column — profile form + password */}
        <div className="space-y-6">
          {/* Profile form */}
          <form
            className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              setProfileMessage(null);
              saveProfile({
                full_name: String(fd.get("full_name") || ""),
                avatar_url: String(fd.get("avatar_url") || "") || null,
              });
            }}
          >
            <div className="mb-5 flex items-center gap-3">
              <UserCircle2 className="h-5 w-5 text-indigo-600" />
              <h2 className="text-lg font-semibold text-slate-900">Profile details</h2>
            </div>

            <div className="grid gap-4">
              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-700">Display name</span>
                <input
                  name="full_name"
                  defaultValue={account?.full_name ?? ""}
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                />
              </label>

              {!isGoogleUser && (
                <label className="space-y-2">
                  <span className="inline-flex items-center gap-2 text-sm font-medium text-slate-700">
                    <Camera className="h-4 w-4" />
                    Profile picture URL
                  </span>
                  <input
                    name="avatar_url"
                    defaultValue={account?.avatar_url ?? ""}
                    placeholder="https://..."
                    className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                  />
                </label>
              )}

              {isGoogleUser && (
                <div className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-xs text-slate-500">
                  Your profile picture is managed by Google and updates automatically.
                </div>
              )}

              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-700">Email address</span>
                <input
                  value={account?.email ?? ""}
                  readOnly
                  className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-500 outline-none"
                />
              </label>
            </div>

            <div className="mt-5 flex items-center justify-between gap-4">
              {profileMessage && <p className="text-sm text-emerald-600">{profileMessage}</p>}
              <button
                type="submit"
                disabled={isSavingProfile}
                className="ml-auto inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-5 py-3 font-semibold text-white transition hover:bg-indigo-700 disabled:opacity-60"
              >
                <Save className="h-4 w-4" />
                {isSavingProfile ? "Saving..." : "Save profile"}
              </button>
            </div>
          </form>

          {/* Password form */}
          <form
            className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm"
            onSubmit={(e) => {
              e.preventDefault();
              const fd = new FormData(e.currentTarget);
              const password = String(fd.get("password") || "");
              const confirm = String(fd.get("confirm_password") || "");
              setPasswordMessage(null);

              if (password.length < 8) {
                setPasswordMessage({ ok: false, text: "Password must be at least 8 characters." });
                return;
              }
              if (password !== confirm) {
                setPasswordMessage({ ok: false, text: "Passwords do not match." });
                return;
              }
              updatePassword(password);
              e.currentTarget.reset();
            }}
          >
            <div className="mb-2 flex items-center gap-3">
              <KeyRound className="h-5 w-5 text-indigo-600" />
              <h2 className="text-lg font-semibold text-slate-900">Password</h2>
            </div>

            {isGoogleUser && (
              <p className="mb-4 text-sm text-slate-500">
                You signed in with Google. You can set a password here to also enable email/password login.
              </p>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-700">New password</span>
                <input
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                />
              </label>
              <label className="space-y-2">
                <span className="text-sm font-medium text-slate-700">Confirm password</span>
                <input
                  name="confirm_password"
                  type="password"
                  autoComplete="new-password"
                  className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-100"
                />
              </label>
            </div>

            <div className="mt-5 flex items-center justify-between gap-4">
              {passwordMessage && (
                <div className={`flex items-center gap-2 text-sm ${passwordMessage.ok ? "text-emerald-600" : "text-rose-600"}`}>
                  {passwordMessage.ok
                    ? <CheckCircle2 className="h-4 w-4 shrink-0" />
                    : <AlertCircle className="h-4 w-4 shrink-0" />}
                  {passwordMessage.text}
                </div>
              )}
              <button
                type="submit"
                disabled={isUpdatingPassword}
                className="ml-auto inline-flex items-center gap-2 rounded-2xl bg-slate-900 px-5 py-3 font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
              >
                <KeyRound className="h-4 w-4" />
                {isUpdatingPassword ? "Updating..." : "Update password"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

// ── Subscription management component ────────────────────────────────────────

function SubscriptionActions() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const openPortal = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      const payload = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !payload.url) {
        throw new Error(payload.error || "Could not open the customer portal.");
      }
      window.location.assign(payload.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setIsLoading(false);
    }
  };

  return (
    <div className="mt-5 space-y-2">
      {/* Active badge */}
      <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
        <CheckCircle2 className="h-4 w-4" />
        Active subscription
      </div>

      {/* Manage subscription — opens Polar customer portal */}
      <button
        onClick={openPortal}
        disabled={isLoading}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60 hover:cursor-pointer"
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Opening portal...
          </>
        ) : (
          <>
            <ExternalLink className="h-4 w-4" />
            Manage subscription
          </>
        )}
      </button>

      {/* Cancel subscription — shows confirmation then opens portal */}
      {!showCancelConfirm ? (
        <button
          onClick={() => setShowCancelConfirm(true)}
          className="w-full rounded-2xl px-4 py-2.5 text-sm font-medium text-rose-500 transition hover:bg-rose-50 hover:cursor-pointer"
        >
          Cancel subscription
        </button>
      ) : (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4">
          <p className="text-sm font-semibold text-rose-800">
            Are you sure you want to cancel?
          </p>
          <p className="mt-1 text-xs text-rose-600">
            You&apos;ll keep access until the end of your current billing period.
            No refunds are issued for partial periods.
          </p>
          <div className="mt-3 flex gap-2">
            <button
              onClick={openPortal}
              disabled={isLoading}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-xl bg-rose-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-rose-700 disabled:opacity-60"
            >
              {isLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
              Yes, cancel
            </button>
            <button
              onClick={() => setShowCancelConfirm(false)}
              className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Keep plan
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs text-rose-700">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {error}
        </div>
      )}

      <p className="text-center text-[11px] text-slate-400">
        Subscription managed securely by{" "}
        <a
          href="https://polar.sh"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:text-slate-600"
        >
          Polar
        </a>
      </p>
    </div>
  );
}
