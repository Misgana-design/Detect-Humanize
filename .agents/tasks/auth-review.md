# Authentication Review — Detect-AI Pro (Text Humanica)

> **Summary:** The app uses a hybrid dual-method system: email/password (via Supabase `signInWithPassword`) combined with Google OAuth (via `signInWithOAuth`). Session management is fully cookie-based using `@supabase/ssr`, and all security-sensitive actions run through `supabase.auth.getUser()` on the server rather than trusting client-side tokens. There is **no `src/middleware.ts`** — route protection is enforced at the API and page level, not at the edge. The implementation is solid for a consumer SaaS but carries a notable user-enumeration risk, has no MFA, and exposes error messages in URL query parameters. The recommended improvement is to make Google OAuth the default path and keep email/password as a secondary option, while adding an optional email OTP (magic link) fallback.

---

## 1. How the Current Auth Works — End to End

### Sign-Up Flow

**Entry point:** `src/app/auth/signup/page.tsx`

The signup page is a server component that renders a form calling the `signup` Server Action, plus a `GoogleAuthButton` component for OAuth. The form collects: full name, email, and password.

**Server Action (`src/app/auth/actions.ts` — `signup()`):**

1. Validates input with Zod (`signupSchema`): name ≥ 2 chars, valid email, password ≥ 8 chars with at least one letter and one number.
2. Uses the **service-role** client (`createServiceSupabaseClient`) to query `public.profiles` by email to detect duplicate accounts. This gives a cleaner user-facing message but introduces a user-enumeration vector (see §4).
3. If no duplicate, calls `supabase.auth.signUp({ email, password, options: { data: { full_name } } })` on the **server Supabase client** (`createServerSupabaseClient`).
4. Supabase creates an entry in `auth.users`; the `on_auth_user_created` database trigger (`migration 010_fix_credits_and_sync.sql`) fires automatically and inserts a `public.profiles` row with `subscription_tier = 'free'` and `credits = 1000`.
5. Redirects to `/dashboard?new_signup=1` on success, or back to `/auth/signup?error=...` on failure.

**No email verification step is visible in the code.** `signUp` is called without `emailRedirectTo`, meaning Supabase either auto-confirms the user (if "Confirm email" is disabled in the Supabase project settings) or sends a confirmation email and blocks login until confirmed. The code proceeds to redirect to `/dashboard` as if the user is immediately authenticated.

### Login Flow

**Entry point:** `src/app/auth/login/page.tsx`

Same structure: a server component with a form + `GoogleAuthButton`.

**Server Action (`src/app/auth/actions.ts` — `login()`):**

1. Validates with Zod (`loginSchema`): valid email, non-empty password.
2. Uses the **service-role** client to query `public.profiles` by email to confirm an account exists. Returns a "No account found" error if not. (Same enumeration risk as signup.)
3. Calls `supabase.auth.signInWithPassword({ email, password })` on the server Supabase client.
4. After sign-in, calls `supabase.auth.getUser()` to confirm the session was established.
5. Does a second profile lookup by `user.id` to verify profile integrity; signs out and redirects to signup if no profile row exists.
6. Redirects to `/dashboard` on success.

### Google OAuth Flow

**Trigger:** `src/components/auth/GoogleAuthButton.tsx` (a client component)

1. Calls `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo, prompt: 'select_account' } })` directly from the browser using the public anon key. The `redirectTo` is `{origin}/auth/callback?next=/dashboard&intent=login|signup`.
2. Google redirects the user back to `/auth/callback?code=...`.

**Callback handler (`src/app/auth/callback/route.ts`):**

1. Extracts `code`, `next`, and `intent` from the URL.
2. Calls `supabase.auth.exchangeCodeForSession(code)` on the **server** Supabase client — this exchanges the authorization code for a session and sets the session cookie.
3. Calls `supabase.auth.getUser()` to load the authenticated user.
4. If `intent === 'login'` and `isFreshOAuthUser(user.created_at)` (created within 30 seconds), it **deletes the just-created user** via the admin API and redirects to signup with an error. This prevents Google from creating phantom accounts when the user meant to log in.
5. Upserts `public.profiles` from `user.user_metadata` (name, avatar).
6. Redirects to `/dashboard?new_signup=1` for new signups, or `next` for existing users.

`safeRelativePath()` validates the `next` parameter to prevent open-redirect attacks: it only allows paths starting with `/` (but not `//`), and it re-parses through `new URL()` to strip host.

### Logout Flow

**Component:** `src/components/auth/LogoutButton.tsx` calls the `logout` Server Action.

**`logout()` in `src/app/auth/actions.ts`:**

1. Calls `supabase.auth.signOut()` on the server client — this clears the session cookie.
2. Redirects to `/auth/login`.

### Session Management

Sessions are cookie-based, managed by `@supabase/ssr`. The two client factories are:

**`src/lib/supabase/client.ts`:** Creates a browser client via `createBrowserClient` from `@supabase/ssr`. Used in client components (Navbar, dashboard page, AccountPageClient). Reads/writes session cookies automatically.

**`src/lib/supabase/server.ts`:** Creates a server client via `createServerClient` from `@supabase/ssr`. Used in Server Actions, API routes, and the OAuth callback. Reads cookies from the Next.js `cookies()` store and writes session updates back.

**No token handling is manual.** Supabase SSR handles access token refresh transparently via cookies.

### Route Protection

**There is no `src/middleware.ts` file.** Route protection is enforced at two levels:

1. **API routes** — every route handler that needs auth calls `supabase.auth.getUser()` and returns 401 if `user` is null. Examples: `src/app/api/humanize/route.ts`, `src/app/api/billing/checkout/route.ts`, `src/app/api/account/api-keys/route.ts`.

2. **Page-level** — the dashboard pages are client components that fetch data via `useProfile` and `useSuspenseQuery`. They do not explicitly redirect unauthenticated users; the Supabase RLS policies on `public.profiles` and `public.documents` ensure that unauthenticated browser clients receive no data. The Navbar fetches auth state on mount via `supabase.auth.getUser()` and shows login/signup links for unauthenticated users.

The dashboard layout (`src/app/dashboard/layout.tsx`) does **not** check auth — it renders unconditionally. An unauthenticated visitor can navigate to `/dashboard` and see the page skeleton; they simply get empty query results due to RLS.

### Server-Side vs Client-Side Auth Checks

| Layer | Method | Note |
|---|---|---|
| Server Actions (signup, login, logout) | `createServerSupabaseClient` + `auth.getUser()` | Authoritative; reads JWT from cookie |
| API Route handlers | `createServerSupabaseClient` + `auth.getUser()` | Authoritative; rejects unauthenticated |
| Client components (Navbar, AccountPage) | `createBrowserClient` + `auth.getUser()` | For UI state only; not a security gate |
| `useProfile` hook | Browser client + RLS | Fetches profile; returns null if not authed |

`supabase.auth.getUser()` (not `getSession()`) is used on the server path — this is the correct pattern because `getUser()` re-validates the JWT with Supabase's server rather than reading it from the cookie alone.

---

## 2. Auth Methods in Use

| Method | Status |
|---|---|
| Email / Password | ✅ Active (`signInWithPassword`, `signUp`) |
| Google OAuth 2.0 | ✅ Active (`signInWithOAuth`) |
| Magic Links | ❌ Not implemented |
| OTP / SMS | ❌ Not implemented |
| Passkeys / WebAuthn | ❌ Not implemented |
| MFA (TOTP or SMS) | ❌ Not implemented |

**Environment variables in use (key names only):**

- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL (public)
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Supabase anon/public key (public)
- `SUPABASE_SERVICE_ROLE_KEY` — Service-role key, server-only; used exclusively in `createServiceSupabaseClient()` which disables `autoRefreshToken` and `persistSession`

The ENV_EXAMPLE.md does **not** list `SUPABASE_SERVICE_ROLE_KEY`, which means a new developer following the template would get a runtime error on signup/login when `createServiceSupabaseClient()` throws.

---

## 3. Strengths

1. **Correct server-side token validation.** All API routes and Server Actions use `supabase.auth.getUser()` (which validates against Supabase's server), not `getSession()` (which only reads the local cookie). This is the right pattern and prevents session-fixation via tampered cookies.

2. **Service-role client is properly isolated.** `createServiceSupabaseClient()` is only used server-side, has `persistSession: false` and `autoRefreshToken: false`, and is never exposed to the browser. The `consume_plan_usage` RPC is restricted to `service_role` only (migration 009/010).

3. **Input validation before any DB call.** Zod schemas run before any Supabase call in both `signup()` and `login()`, preventing garbage data from reaching the database.

4. **Profile creation is atomic via DB trigger.** The `handle_new_user` trigger on `auth.users` (migration 010) inserts the profile row in the same transaction as user creation. This eliminates the race condition of a user existing in `auth.users` without a `profiles` row.

5. **RLS is enabled on all tables.** Migrations 006 and 011 enable RLS on `profiles`, `documents`, `detection_results`, `detection_cache`, `humanization_cache`. Migration 011 restricts column-level updates on `profiles` to only `full_name` and `avatar_url`, preventing clients from self-promoting their subscription tier.

6. **Open-redirect protection in OAuth callback.** `safeRelativePath()` validates the `next` parameter, preventing redirect to external domains.

7. **Google account-picker forced.** `prompt: 'select_account'` in `GoogleAuthButton` prevents silent re-use of cached Google sessions, which is good for a multi-user device scenario.

8. **Phantom-user deletion for login-via-Google mismatch.** The callback detects if a newly created OAuth user navigated via `intent=login` and deletes the account immediately, keeping `auth.users` clean.

---

## 4. Security Risks and Usability Issues

### Risk 1 — User Enumeration (Medium)

**File:** `src/app/auth/actions.ts`, `login()` lines ~109–120 and `signup()` lines ~52–66.

Both the login and signup Server Actions query `public.profiles` by email before attempting auth. This means an attacker can determine whether any given email address has an account by submitting the form and reading the error message:

- "No account found with this email" → email is not registered
- "An account with this email already exists" → email is registered

The code itself acknowledges this: `// NOTE: This improves UX by giving a clear "no account" message, but it does introduce a user enumeration vector.`

For a consumer writing tool this is low severity, but it would be a problem if the app handled sensitive personal data.

### Risk 2 — Error Messages in URL Query Parameters (Low-Medium)

**File:** `src/app/auth/actions.ts`, `authPath()` helper.

All error messages are passed as `?error=...` query parameters, e.g. `/auth/login?error=Invalid+login+credentials`. This means:

- Error messages appear in browser history, server access logs, and referrer headers.
- If a user copies/shares their URL after a failed login, they share the error message.
- The `email` field is also in the URL on certain flows (e.g., `/auth/signup?error=already+exists&email=user%40example.com`), which logs the email in HTTP access logs.

### Risk 3 — No Middleware-Level Route Guard (Medium)

**No `src/middleware.ts` exists.** Protected pages like `/dashboard`, `/account`, and the bulk humanizer are not guarded at the edge. An unauthenticated visitor hitting `/dashboard` renders the full page HTML (the skeleton/layout) before the client determines they are not logged in. They receive no data due to RLS, but:

- Page structure and UI are visible without authentication.
- There is no server-side redirect to `/auth/login` for unauthenticated users hitting protected routes.
- API routes protect themselves individually, but the pages do not.

This is not a data-leak vulnerability (RLS prevents data exposure), but it is an incomplete security posture and causes a visible flash of the dashboard skeleton for unauthenticated visitors.

### Risk 4 — No Email Verification Enforcement (Medium)

The signup `actions.ts` calls `supabase.auth.signUp()` and immediately redirects to `/dashboard`. If the Supabase project has "Confirm email" disabled (which is common in development and sometimes left off in production), users can sign up with any email they do not own. There is no confirmation gate in the application code. Whether this is a problem depends entirely on the Supabase project configuration, which is not visible in the codebase.

### Risk 5 — No MFA (Low-Medium)

There is no multi-factor authentication option. For an AI productivity SaaS handling paid subscriptions and API keys, this is a notable gap. A compromised password is sufficient to access billing and API keys.

### Risk 6 — Password Update for Google Users Without Prior Verification (Low)

**File:** `src/components/account/AccountPageClient.tsx`, password form.

Google-authenticated users can set a password via `supabase.auth.updateUser({ password })` without first verifying ownership of their current session via a re-authentication step. If an attacker has a brief session window, they could set a password on the account, creating a persistent credential. Supabase does not require the current password to set a new one for OAuth users.

### Risk 7 — `SUPABASE_SERVICE_ROLE_KEY` Missing from ENV_EXAMPLE.md (Low)

**File:** `ENV_EXAMPLE.md`

The service-role key is not documented in the example env file. Any developer deploying this app from the template will get a runtime crash on their first signup or login attempt (the `createServiceSupabaseClient()` function throws `Error: SUPABASE_SERVICE_ROLE_KEY is not set`).

### Risk 8 — isFreshOAuthUser Time Window (Very Low)

**File:** `src/app/auth/callback/route.ts`, `isFreshOAuthUser()`.

The 30-second window used to distinguish a new OAuth signup from an existing login is a heuristic. Under slow network conditions or a delayed callback, a fresh signup could be mistakenly identified as an existing login attempt and deleted. Extremely unlikely in practice but architecturally fragile.

---

## 5. Comparison of Alternative Auth Methods

Given the stack (Next.js 14+ App Router, TypeScript, Supabase Auth), here is how the main alternatives compare:

| Method | Security | UX | Implementation Effort | Notes |
|---|---|---|---|---|
| **Email + Password (current)** | Medium | Medium | Done | User manages passwords; phishing/breach risk; needs MFA to be strong |
| **Google OAuth (current, secondary)** | High | High | Done | Delegates to Google's security; no password to breach |
| **OAuth-only (Google + GitHub)** | High | High | Low — Supabase has built-in providers | Eliminates passwords entirely; users without Google need another provider |
| **Magic Link (email OTP)** | Medium-High | High | Low — `supabase.auth.signInWithOtp()` | Passwordless; one-click login; requires email delivery reliability |
| **SMS OTP** | Medium | Medium | Medium — needs Twilio/Vonage + Supabase config | Phone number required; carrier costs; SIM-swap attacks |
| **Passkeys (WebAuthn)** | Very High | High (on supported devices) | High — not natively in Supabase Auth yet; needs third-party (Hanko, etc.) | Best long-term; no phishing possible; poor browser/device coverage still growing |
| **TOTP MFA (as addition)** | High (layered) | Medium | Low — Supabase `auth.mfa.enroll()` API | Best added on top of existing auth, not as a replacement |
| **Passwordless email link** | High | Very High | Low | Subset of magic link; eliminates the password field entirely |

**Supabase-specific notes:**
- Magic links are a first-class feature: `supabase.auth.signInWithOtp({ email })` sends a one-click login link. No additional infrastructure needed.
- TOTP MFA is available in Supabase Auth as of late 2023 via `supabase.auth.mfa.*` APIs.
- Passkeys are not yet natively supported in Supabase Auth; they require a workaround or third-party service.

---

## 6. Recommended Better Method

### Primary recommendation: Keep Google OAuth as the hero path; add Magic Link as the passwordless fallback; add optional TOTP MFA

**Why this combination is right for this app:**

The app is a consumer AI writing tool. Its users care about getting started quickly, not managing passwords. Currently, Google OAuth is an afterthought positioned below the email/password form with a divider that says "Or continue with." The recommendation is to invert this: make Google the primary CTA, and replace the email/password form with a magic-link flow for users who don't have a Google account.

**Google OAuth as primary (keep what exists, elevate its position):**
- Zero password management for the majority of users.
- Google's own account security (2FA, breach detection) protects these users automatically.
- The callback handler is already well-implemented.

**Magic Link as the email fallback (replace email/password):**
- Eliminates the entire class of password-related risks: breach, reuse, phishing.
- UX is simpler: user enters email, clicks link in inbox, done.
- Supabase makes this trivial: `supabase.auth.signInWithOtp({ email, options: { shouldCreateUser: true } })`.
- The distinction between signup and login collapses into one flow — one form, two outcomes handled by Supabase.
- Removes the user-enumeration risk entirely because both new and existing users receive the same "check your inbox" response.

**Optional TOTP MFA (add on top):**
- Users with active paid subscriptions or API keys are a meaningful target.
- Supabase's `auth.mfa.enroll()` / `auth.mfa.challenge()` / `auth.mfa.verify()` APIs handle this without additional infrastructure.
- Make it opt-in from the account settings page.

**What to keep:** The service-role isolation, the DB trigger for profile creation, the RLS policies, and `getUser()` on every server path — these are all good and should not change.

---

## 7. Practical Migration Path

This path preserves all existing users (both email/password and Google OAuth accounts).

### Phase 1 — Add middleware route protection (1–2 hours, no user impact)

Create `src/middleware.ts` at the project root with the `@supabase/ssr` pattern. Check the session cookie for routes matching `/dashboard/:path*`, `/account/:path*`, `/api/humanize/:path*`, and `/api/billing/:path*`. Redirect unauthenticated requests to `/auth/login?next=<encodedPath>`. This fixes Risk 3 without touching any auth logic.

```typescript
// src/middleware.ts (sketch)
import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request })
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { cookies: { /* standard getAll/setAll pattern */ } }
  )
  const { data: { user } } = await supabase.auth.getUser()
  if (!user && request.nextUrl.pathname.startsWith('/dashboard')) {
    const url = request.nextUrl.clone()
    url.pathname = '/auth/login'
    url.searchParams.set('next', request.nextUrl.pathname)
    return NextResponse.redirect(url)
  }
  return response
}

export const config = { matcher: ['/dashboard/:path*', '/account/:path*'] }
```

**No user impact.** Existing sessions are unaffected.

### Phase 2 — Document `SUPABASE_SERVICE_ROLE_KEY` in ENV_EXAMPLE.md (15 minutes)

Add the key name (not the value) to `ENV_EXAMPLE.md`. This fixes Risk 7. Commit separately.

### Phase 3 — Move errors out of URL parameters (2–3 hours, no user impact)

Replace the `authPath()` query-parameter error pattern in `src/app/auth/actions.ts` with a server-side cookie or a signed flash message. One practical approach with the current stack: set a short-lived `__auth_error` cookie in the Server Action response, then read and clear it in the page component. This keeps errors off URLs, out of logs, and out of browser history. No user-visible behavior change.

### Phase 4 — Add Magic Link as an auth option (3–4 hours, zero migration impact)

Add a third auth option to the login and signup pages: an "Email me a link" button that calls a new Server Action:

```typescript
// In actions.ts
export async function sendMagicLink(formData: FormData) {
  const email = (formData.get('email') as string)?.trim().toLowerCase()
  const supabase = await createServerSupabaseClient()
  // shouldCreateUser: true means this works for both new and returning users
  await supabase.auth.signInWithOtp({
    email,
    options: { shouldCreateUser: true, emailRedirectTo: `${origin}/auth/callback?intent=login` }
  })
  // Always return the same response — no enumeration possible
  return redirect('/auth/login?info=Check+your+inbox')
}
```

The existing callback handler already handles the code exchange, so no changes are needed there. Existing email/password users are entirely unaffected.

### Phase 5 — Add optional TOTP MFA for paid users (4–6 hours, opt-in only)

Add an MFA section to `src/components/account/AccountPageClient.tsx`. Use `supabase.auth.mfa.enroll({ factorType: 'totp' })` to generate a QR code, and `supabase.auth.mfa.challenge()` + `supabase.auth.mfa.verify()` to complete setup. Only show this section for non-free subscribers. No existing user is forced to enroll.

### Phase 6 — Deprecate email/password (optional, future, months away)

Only do this after magic links have been live for a billing cycle and user adoption is clear. Send email notice to email/password users with instructions to either link their Google account or use magic link. Supabase allows linking multiple identities to one account via `supabase.auth.linkIdentity()`. Keep email/password login working for at least 90 days after the notice.

**Never delete existing `auth.users` rows as part of this migration.** Only deprecate the UI path.

---

## Digest

| File | Block / Symbol | What was verified |
|---|---|---|
| `src/app/auth/actions.ts` | `signup()`, `login()`, `logout()`, `signupSchema`, `loginSchema`, `authPath()` | Full read; all logic traced |
| `src/app/auth/callback/route.ts` | `GET()`, `safeRelativePath()`, `isFreshOAuthUser()`, `authRedirect()` | Full read |
| `src/app/auth/signup/page.tsx` | `SignupPage`, `SignupFormContent` | Full read |
| `src/app/auth/login/page.tsx` | `LoginPage`, `LoginFormContent` | Full read |
| `src/app/auth/layout.tsx` | `AuthLayout` | Full read |
| `src/components/auth/GoogleAuthButton.tsx` | `GoogleAuthButton`, `handleGoogleSignIn()` | Full read |
| `src/components/auth/LogoutButton.tsx` | `LogoutButton` | Full read |
| `src/components/auth/ProfileMenu.tsx` | `ProfileMenu` | Full read |
| `src/lib/supabase/client.ts` | `createClient()` | Full read |
| `src/lib/supabase/server.ts` | `createServerSupabaseClient()`, `createServiceSupabaseClient()` | Full read |
| `src/app/dashboard/layout.tsx` | `DashboardLayout` | Full read — no auth gate present |
| `src/app/dashboard/page.tsx` | `DashboardContent` | Full read — client component, no server-side redirect |
| `src/components/layout/Navbar.tsx` | Auth state `useEffect`, `onAuthStateChange` subscription | Full read |
| `src/app/providers.tsx` | `Providers` (QueryClientProvider only) | Full read — no auth context |
| `src/hooks/userProfile.ts` | `useProfile()` | Full read |
| `src/app/api/humanize/route.ts` | `POST()`, `supabase.auth.getUser()` guard | Full read |
| `src/app/api/billing/checkout/route.ts` | `POST()`, `supabase.auth.getUser()` guard | Full read |
| `src/app/api/account/api-keys/route.ts` | `GET()`, `POST()`, `DELETE()` | Full read |
| `src/components/account/AccountPageClient.tsx` | Password update form, profile update mutation | Full read (truncated at ~30KB but auth-relevant section fully covered) |
| `src/app/account/page.tsx` | `AccountPage` — server component, no auth gate | Full read |
| `next.config.ts` | Full file | No auth-relevant redirects or headers |
| `ENV_EXAMPLE.md` | Full file | `SUPABASE_SERVICE_ROLE_KEY` not listed — confirmed Risk 7 |
| `supabase/migrations/004_profiles_columns.sql` | Schema setup | Read |
| `supabase/migrations/006_rls_and_schema_consistency.sql` | RLS policies for all tables | Full read |
| `supabase/migrations/008_security_fixes_and_tone_update.sql` | `consume_plan_usage` security | Full read |
| `supabase/migrations/009_fix_consume_plan_usage_security.sql` | Service-role restriction | Full read |
| `supabase/migrations/010_billing_plan_repair.sql` | `handle_new_user` trigger | Full read |
| `supabase/migrations/010_fix_credits_and_sync.sql` | Profile trigger, credits | Full read |
| `supabase/migrations/011_auth_hardening.sql` | Column-level GRANT restriction on profiles | Full read |
| `src/middleware.ts` | Does not exist | Confirmed by `Test-Path` returning `False` |
