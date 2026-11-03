# Investigation: `api_usage_count` / usage columns reset to first-subscribe values

## Summary (root cause)

The reset is caused by **`activatePlan()` in the Polar webhook handler**
(`src/app/api/webhooks/polar/route.ts`, lines ~181–199). Every time Polar sends a
subscription lifecycle event for an **active** subscription — `subscription.created`,
`subscription.active`, `subscription.updated`, `subscription.uncanceled` — and on
`order.paid` (which includes subscription renewals), the handler runs a blanket
`profiles.update` that hard-sets usage columns back to their initial values:

```ts
const { data: updated, error } = await supabase
  .from("profiles")
  .update({
    subscription_tier: mapping.tier,
    billing_cadence: mapping.cadence,
    polar_customer_id: data.polarCustomerId,
    polar_subscription_id: data.subscriptionId,
    words_used: 0,            // ← RESETS consumed-word counter
    api_usage_count: 0,       // ← RESETS request counter (the reported symptom)
    credits: getPlanStartingCredits(mapping.tier),  // ← RESETS to first-subscribe value
    updated_at: new Date().toISOString(),
  })
  .eq("id", userId)
```

This sets `words_used`, `api_usage_count`, and `credits` to **exactly the values the
user had the moment they first subscribed** — which matches the reported symptom
("all the columns have been reset to the values they had when the user first
subscribed"). A Pro‑Weekly user who used up their quota and reached
`api_usage_count = 4` gets wiped back to `api_usage_count = 0` the next time Polar
fires a renewal/update event (e.g. `subscription.updated` at period renewal, or
`order.paid` for the renewal invoice).

`downgradeToFree()` in the same file (lines ~210–226) does the same reset
(`words_used: 0, api_usage_count: 0, credits: getPlanStartingCredits("free")`) on
`subscription.revoked`, `subscription.past_due`, and refunded orders — this one is
intended behaviour on cancel/expire, but it still has the same "reset everything"
shape and is worth narrowing.

No DB trigger and no other code path resets usage columns on `profiles`. The
`consume_plan_usage` RPC only ever **increments** the counters.

---

## Trigger condition (what fires the reset)

In `src/app/api/webhooks/polar/route.ts`, the `POST` handler dispatches on
`event.type`:

```ts
case "order.paid":
  if (data.subscriptionId) {
    await activatePlan(data);          // subscription order → RESETS usage
  } else { ...credit pack... }
  break;

case "subscription.created":
case "subscription.active":
case "subscription.updated":
case "subscription.uncanceled":
  if (data.status === "active" || event.type === "subscription.active" || event.type === "subscription.uncanceled") {
    await activatePlan(data);          // any active lifecycle event → RESETS usage
  }
  break;

case "subscription.revoked":
case "subscription.past_due":
  await downgradeToFree(data, event.type);  // RESETS usage to free defaults
  break;

case "order.refunded":
  const wasCreditPack = await refundCreditPack(data);
  if (!wasCreditPack) {
    await downgradeToFree(data, "order refund");  // RESETS usage
    await revokeRefundedSubscription(data);
  }
  break;
```

So the reset fires on, in order of likelihood for a recurring Pro‑Weekly subscriber:

1. **`subscription.updated`** — Polar emits this on renewal and on metadata changes.
   The condition `data.status === "active"` is true for an active renewal, so
   `activatePlan` runs and zeroes usage. **Most likely the recurring trigger.**
2. **`order.paid`** with a `subscriptionId` — the renewal invoice payment. Also
   calls `activatePlan`.
3. **`subscription.active` / `subscription.uncanceled` / `subscription.created`**
   when status is active — same reset.

The cancellation path (`subscription.canceled`) intentionally does nothing, so the
reset is **not** tied to a user clicking "cancel" — it is tied to renewal/lifecycle
events for an active subscription.

---

## Answers to the specific questions

### 1. Which code paths UPDATE/UPSERT `profiles` including usage columns?

Only the Polar webhook (production) and the manual-upgrade route (dev-only):

- **`activatePlan`** — `src/app/api/webhooks/polar/route.ts:184–192` — writes
  `words_used: 0`, `api_usage_count: 0`, `credits: <starting>`. **Root cause.**
- **`downgradeToFree`** — `src/app/api/webhooks/polar/route.ts:213–220` — writes
  `words_used: 0`, `api_usage_count: 0`, `credits: <free starting>`. Fires on
  revoke/past-due/refund (intended on those events, but should still be
  scope-narrowed).
- **`manual-upgrade` POST** — `src/app/api/billing/manual-upgrade/route.ts:55–62`
  — writes `words_used: 0`, `api_usage_count: 0`, `credits: <starting>`. Gated by
  `if (process.env.NODE_ENV === "production") return 403;` → cannot run in prod.
- **`manual-upgrade` DELETE** — `src/app/api/billing/manual-upgrade/route.ts:96–103`
  — same reset to free. Also dev-only.

The OAuth callback upsert (next question) does **not** include usage columns.

### 2. Polar webhook: which event types write `profiles`, and does the write include usage columns?

Writes on: `order.paid` (subscription), `subscription.created/active/updated/uncanceled`
(active), `subscription.revoked`, `subscription.past_due`, `order.refunded`
(non-credit-pack). Yes — every one of those writes **includes usage columns**
(`words_used`, `api_usage_count`, `credits`) via a blanket `.update(...)` that sets
them to 0 / starting values. It is **not** a targeted subscription-only update; it
clobbers usage.

### 3. Is there a DB trigger that resets usage columns on `profiles` UPDATE?

**No.** The only trigger touching the auth/profile chain is
`on_auth_user_created` (`AFTER INSERT ON auth.users`, defined in
`supabase/migrations/010_fix_credits_and_sync.sql:79–82`), which fires only on
signup (insert of a new `auth.users` row) and calls `handle_new_user()`. Its
`ON CONFLICT (id) DO UPDATE SET` clause only touches `email`, `full_name`,
`avatar_url` (with `COALESCE` to preserve existing) — it never sets
`words_used`/`api_usage_count`/`credits` on conflict. There is **no** trigger on
`profiles` UPDATE. (`set_documents_updated_at` in migration 006 is on
`public.documents`, not `profiles`.)

### 4. Does the OAuth callback upsert run for existing users and reset usage?

It **does** run for an existing user on every Google login (the upsert is outside
the fresh-user check), but it **does not reset usage columns**. The payload
contains only `id`, `email`, `full_name`, `avatar_url`
(`src/app/auth/callback/route.ts:70–84`):

```ts
await serviceSupabase.from("profiles").upsert(
  {
    id: user.id,
    email: user.email,
    full_name: ...,
    avatar_url: ...,
  },
  { onConflict: "id" },
);
```

Supabase/PostgREST `upsert` with `onConflict` generates
`INSERT ... ON CONFLICT (id) DO UPDATE SET <col> = EXCLUDED.<col>` **only for the
columns present in the payload**. Because `words_used`, `api_usage_count`,
`credits`, and `extra_credits` are **not** in the payload, they are **not**
overwritten. So the OAuth callback is safe for usage columns despite running on
every login. (It is still an unnecessary write on every login and could be limited
to signup intent, but that is a cleanup, not a bug fix.)

### 5. What is the exact fix?

Stop resetting usage counters when (re)activating a plan. `activatePlan` should
only update subscription-state columns, not usage columns. Specifically, remove
`words_used`, `api_usage_count`, and `credits` from the `.update(...)` in
`activatePlan` (and apply the same reasoning to `downgradeToFree` if you want
cancelled/expired users to keep their historical counts — though resetting on
downgrade is arguably acceptable).

**Before** (`src/app/api/webhooks/polar/route.ts`, the `activatePlan` update):

```ts
const { data: updated, error } = await supabase
  .from("profiles")
  .update({
    subscription_tier: mapping.tier,
    billing_cadence: mapping.cadence,
    polar_customer_id: data.polarCustomerId,
    polar_subscription_id: data.subscriptionId,
    words_used: 0,                                    // REMOVE
    api_usage_count: 0,                               // REMOVE
    credits: getPlanStartingCredits(mapping.tier),    // REMOVE (derived from words_used)
    updated_at: new Date().toISOString(),
  })
  .eq("id", userId)
  .select("id, subscription_tier, billing_cadence, polar_subscription_id, words_used, credits")
  .single();
```

**After** (targeted update — only subscription-state columns):

```ts
const { data: updated, error } = await supabase
  .from("profiles")
  .update({
    subscription_tier: mapping.tier,
    billing_cadence: mapping.cadence,
    polar_customer_id: data.polarCustomerId,
    polar_subscription_id: data.subscriptionId,
    updated_at: new Date().toISOString(),
  })
  .eq("id", userId)
  .select("id, subscription_tier, billing_cadence, polar_subscription_id, words_used, credits")
  .single();
```

Notes on this fix:
- `credits` is **derived** from `words_used` by `sync_profile_credits`
  (quota − words_used), so it must not be force-set to the starting value either;
  leaving it untouched is correct. (If you want a renewal to actually grant a new
  quota period, the correct reset target is `words_used = 0` only on a true renewal
  boundary — see the alternative below.)
- `extra_credits` (purchased credit packs) is **never touched** by `activatePlan`
  today, so it is already preserved; do not add it to the update.

**Alternative (if the intended semantics are "renewal grants a fresh quota
period"):** distinguish a genuine plan-change/first-activation from a renewal, and
only zero `words_used` on a true renewal boundary — and even then, leave
`api_usage_count` alone (it is a cumulative request counter, not a period quota).
`api_usage_count` should be **increment-only** (`consume_plan_usage` already does
this). Concretely: keep the targeted subscription-state update above for
`subscription.created/active/updated/uncanceled`, and handle the "fresh period"
intent, if desired, separately and explicitly (e.g. only on a verified renewal
invoice, set `words_used = 0` but never `api_usage_count = 0`).

Also remove the same `words_used: 0, api_usage_count: 0, credits: ...` lines from
`manual-upgrade` POST/DELETE if/when that route is ever allowed near production, so
the pattern does not re-enter.

---

## Complete inventory of every write site to `profiles`

Found by grepping `src/**` for `.from("profiles")` and cross-checking each. Only
`update`/`upsert` calls mutate rows; `select` calls are read-only.

| File:line | Operation | Columns written | Resets usage? |
|---|---|---|---|
| `src/app/auth/callback/route.ts:70` | `upsert` `{ onConflict: "id" }` | `id, email, full_name, avatar_url` | **No** (usage columns not in payload; runs on every Google login but harmless) |
| `src/app/api/webhooks/polar/route.ts:182` (`activatePlan`) | `update` `.eq("id", userId)` | `subscription_tier, billing_cadence, polar_customer_id, polar_subscription_id, words_used(=0), api_usage_count(=0), credits(=starting), updated_at` | **YES — root cause** |
| `src/app/api/webhooks/polar/route.ts:211` (`downgradeToFree`) | `update` `.eq("id", userId)` | `subscription_tier(=free), billing_cadence(=free), polar_subscription_id(=null), words_used(=0), api_usage_count(=0), credits(=free starting), updated_at` | **YES** (fires on revoke/past-due/refund; intended on downgrade but over-broad) |
| `src/app/api/billing/manual-upgrade/route.ts:53` (POST) | `update` `.eq("id", user.id)` | `subscription_tier, billing_cadence, polar_subscription_id, words_used(=0), api_usage_count(=0), credits(=starting)` | **YES**, but dev-only (`NODE_ENV === "production"` returns 403) |
| `src/app/api/billing/manual-upgrade/route.ts:94` (DELETE) | `update` `.eq("id", user.id)` | `subscription_tier(=free), billing_cadence(=free), polar_subscription_id(=null), words_used(=0), api_usage_count(=0), credits(=1000)` | **YES**, but dev-only |

Read-only `profiles` access (no reset risk, listed for completeness):
`src/app/api/humanize/route.ts:109`, `src/app/api/humanize/batch/route.ts:67`,
`src/services/userService.ts:17`, `src/proxy.ts:50`, `src/hooks/userProfile.ts:16`,
`src/app/api/billing/portal/route.ts:30`, `src/app/api/billing/credits-checkout/route.ts:34`,
`src/app/auth/actions.ts:59/146/179`, `scripts/send-announcement.ts:182`.

Note: the brief referenced `src/app/api/billing/checkout/route.ts` and
`account/api-keys/route.ts` / `account/team/route.ts` — these do **not** appear in
the `.from("profiles")` search, i.e. they do not touch the `profiles` table at all
(and `billing/checkout/route.ts` does not exist in the repo; only
`billing/credits-checkout` does).

---

## DB triggers / functions that could affect the reset (analysis)

All relevant functions traced in the migrations:

- **`consume_plan_usage(uuid, integer)`** — defined in `005`, hardened in `009`,
  redefined quota-first in `010_billing_plan_repair` and `015_extra_credits`. Every
  version **increments** `api_usage_count` and `words_used` and only ever
  *decrements* `extra_credits` by overflow. It never sets anything to 0. Safe — this
  is the path used by `src/app/api/humanize/route.ts` (via the service-role client).
- **`sync_profile_credits(profile)`** — `010_fix_credits_and_sync` / `010_billing_plan_repair`.
  Pure function: `credits = quota(tier) − words_used`. Derives `credits`; never
  resets counters.
- **`add_extra_credits` / `subtract_extra_credits`** — `015_extra_credits`. Only
  adjust `extra_credits` (and `updated_at`); never touch usage counters. Used by
  the webhook for credit-pack purchase/refund.
- **`increment_api_usage(uuid)`** — `003_increment_api_usage`. Legacy; does
  `api_usage_count = api_usage_count + 1`. Increment-only. Not the cause.
- **`handle_new_user()` + `on_auth_user_created` trigger** — `010_fix_credits_and_sync`.
  Fires `AFTER INSERT ON auth.users` (signup only). On conflict it only sets
  `email`, `full_name` (COALESCE-protected), `avatar_url` (COALESCE-protected). It
  **never** sets usage columns on an existing row. Safe.
- **`016_backfill_api_usage_count`** — one-time repair: sets
  `api_usage_count = GREATEST(api_usage_count, 1)` where `words_used > 0` and
  `api_usage_count = 0`. It **raises** the count, never zeroes it. (Its existence
  confirms the team has seen this exact `api_usage_count = 0` symptom before — but
  it is a one-time backfill, so the bug re-occurs because `activatePlan` keeps
  re-zeroing the column on every renewal.)

**Conclusion on triggers:** there is no DB-level trigger or function that resets
usage columns on `profiles`. The reset is purely application-level, in
`activatePlan` (and `downgradeToFree`).

---

## Caveats / things to verify

- **`extra_credits` is not reset by `activatePlan`.** `activatePlan` does not
  include `extra_credits` in its update, and PostgREST only sets columns present in
  the payload, so purchased credit packs survive. The reported symptom
  ("all columns reset to first-subscribe values") is fully explained by
  `activatePlan` resetting `words_used`, `api_usage_count`, and `credits` — those
  three are exactly the first-subscribe values. If a user genuinely observed
  `extra_credits` going to 0, that would require a separate cause not present in
  the current code; nothing in `src/` or the migrations zeroes `extra_credits`
  except `subtract_extra_credits` on an explicit credit-pack refund.
- The `subscription.updated` → reset path assumes Polar marks renewals as
  `status === "active"`. Confirm in the Polar dashboard which event(s) precede a
  given user's reset; the fix above is correct regardless of which active
  lifecycle event fires, because no active-lifecycle event should zero cumulative
  counters.
- `consume_plan_usage`'s `api_usage_count` is a **cumulative request counter**
  (incremented once per humanize call), not a period quota. Zeroing it is always
  wrong; it should be removed from `activatePlan` regardless of any renewal-quota
  design decision.
