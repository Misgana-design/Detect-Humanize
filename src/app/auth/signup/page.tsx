import Link from "next/link";
import { Suspense } from "react";
import { signup } from "@/app/auth/actions";
import { GoogleAuthButton } from "@/components/auth/GoogleAuthButton";

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[80vh] items-center justify-center text-sm text-slate-500">
          Loading signup form...
        </div>
      }
    >
      <SignupFormContent searchParams={searchParams} />
    </Suspense>
  );
}

async function SignupFormContent({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="relative flex min-h-[80vh] items-center justify-center overflow-hidden px-4 py-12">
      <div className="absolute inset-0 -z-10 bg-[radial-gradient(circle_at_top,_rgba(16,185,129,0.12),_transparent_40%),linear-gradient(to_bottom,_#f8fafc,_#ecfeff)]" />
      <div className="w-full max-w-md rounded-3xl border border-white/70 bg-white/90 p-8 shadow-2xl shadow-emerald-100 backdrop-blur">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-600 text-sm font-bold text-white shadow-lg shadow-emerald-200">
            TH
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Create your account
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Start detecting, humanizing, and saving your documents in one place.
          </p>
        </div>

        <form action={signup} className="space-y-5">
          {error && (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {decodeURIComponent(error)}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700" htmlFor="name">
              Full name
            </label>
            <input
              id="name"
              name="name"
              type="text"
              required
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
              placeholder="Misgana Woldeselassie"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
              placeholder="name@example.com"
            />
          </div>

          <div className="space-y-2">
            <label
              className="text-sm font-medium text-slate-700"
              htmlFor="password"
            >
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={8}
              className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-100"
            />
          </div>

          <button
            type="submit"
            className="w-full rounded-2xl bg-emerald-600 py-3 font-semibold text-white transition hover:bg-emerald-700"
          >
            Create Account
          </button>
        </form>

        <div className="my-5 flex items-center gap-3 text-xs uppercase tracking-[0.2em] text-slate-400">
          <div className="h-px flex-1 bg-slate-200" />
          Or continue with
          <div className="h-px flex-1 bg-slate-200" />
        </div>

        <GoogleAuthButton label="Continue with Google" />

        <p className="mt-6 text-center text-sm text-slate-500">
          Already have an account?{" "}
          <Link href="/auth/login" className="font-medium text-emerald-600 hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
