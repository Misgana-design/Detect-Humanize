# SEO Fix Plan — texthumanica.com
> Ahrefs issues: 3XX redirects (2), title too long (13), meta description too short (4),
> under-linked pages (2), missing H1 (2), HTTP→HTTPS (1), structured data errors (1).
>
> All changes are in `src/` unless stated otherwise. "Content change" = only copy/strings.
> "Code change" = JSX/TS logic. "Config change" = next.config.ts.

---

## Issue 1 — 3XX Redirects

### Findings
- No `http://texthumanica` occurrences found anywhere in source (grep returned empty).
- No `/index` links or old route paths found in any `.tsx` file.
- `next.config.ts` has **no redirects block** at all.
- The only hardcoded absolute URLs are in `src/app/tools/pseo/[slug]/page.tsx`:
  - `canonical` is built as a template literal: `` `https://texthumanica.com/tools/pseo/${slug}` ``
  - JSON-LD `url` uses the same template literal
- These are **correct HTTPS** and will not redirect. No redirect issue exists in source code.
- The Ahrefs redirect warnings are most likely caused by **external inbound links** pointing to a
  non-canonical form (e.g. `http://` variant or a bare domain without `www`) being 301-redirected
  by the hosting platform (Vercel/Nginx). The fix is at the infrastructure level, not source.

### Fix
**File:** `next.config.ts` — Config change

Add an explicit redirect from `http://` to `https://` and from `www.` to the apex domain
(or vice-versa, whichever Vercel is not already handling). This removes any ambiguity if the
CDN redirect is inconsistently applied.

```ts
// next.config.ts
async redirects() {
  return [
    {
      source: "/:path*",
      has: [{ type: "host", value: "www.texthumanica.com" }],
      destination: "https://texthumanica.com/:path*",
      permanent: true,
    },
  ];
},
```

Add this inside the `nextConfig` object (after `poweredByHeader: false`).

> **Note:** Vercel enforces HTTPS at the edge automatically, so the http→https part is
> handled. The `www` → apex redirect above is the only one that may still produce a 301
> that Ahrefs counts. Confirm which canonical domain is set in the Vercel project settings.

---

## Issue 2 — Titles Too Long (> 60 chars)

### How titles are built
`buildMetadata({ title })` in `src/lib/seo.ts` line 28:
```ts
const fullTitle = `${title} | ${siteConfig.name}`;
// siteConfig.name = "Text Humanica"  → adds " | Text Humanica" (16 chars incl. spaces)
```
So the budget for the raw `title` param is **60 − 16 = 44 characters**.

### Audit of every `generateMetadata` call

| File | Raw title passed | Full title (with " | Text Humanica") | Chars | Status |
|---|---|---|---|---|
| `src/app/layout.tsx` | `AI Humanizer — Rewrite AI Text Naturally` | `AI Humanizer — Rewrite AI Text Naturally \| Text Humanica` | 58 | ✅ OK |
| `src/app/page.tsx` | `AI Humanizer for Natural Writing` | `AI Humanizer for Natural Writing \| Text Humanica` | 50 | ✅ OK |
| `src/app/pricing/layout.tsx` | `Pricing for AI Humanization` | `Pricing for AI Humanization \| Text Humanica` | 45 | ✅ OK |
| `src/app/blog/page.tsx` | `AI Detection & Humanization Blog` | `AI Detection & Humanization Blog \| Text Humanica` | 50 | ✅ OK |
| `src/app/faq/page.tsx` | `AI Detector & Humanizer FAQ` | `AI Detector & Humanizer FAQ \| Text Humanica` | 45 | ✅ OK |
| `src/app/contact/page.tsx` | `Contact Support` | `Contact Support \| Text Humanica` | 33 | ✅ OK |
| `src/app/account/page.tsx` | `Manage Account` | `Manage Account \| Text Humanica` | 32 | ✅ OK (noIndex) |
| `src/app/humanize/page.tsx` | `AI Humanizer to Bypass GPTZero & Humanize ChatGPT Text` | `AI Humanizer to Bypass GPTZero & Humanize ChatGPT Text \| Text Humanica` | **71** | ❌ TOO LONG |
| `src/app/tools/page.tsx` | `Text Humanica vs Other AI Detectors & Humanizers` | `Text Humanica vs Other AI Detectors & Humanizers \| Text Humanica` | **65** | ❌ TOO LONG |
| `src/app/detectors/page.tsx` | `AI Detectors We Help You Bypass` | `AI Detectors We Help You Bypass \| Text Humanica` | 49 | ✅ OK |
| `src/app/use-cases/page.tsx` | `AI Detector & Humanizer Use Cases` | `AI Detector & Humanizer Use Cases \| Text Humanica` | 51 | ✅ OK |
| `src/app/cookies/page.tsx` | `Cookie Policy` | `Cookie Policy \| Text Humanica` | 31 | ✅ OK |
| `src/app/privacy/page.tsx` | `Privacy Policy` | `Privacy Policy \| Text Humanica` | 32 | ✅ OK |
| `src/app/terms/page.tsx` | `Terms of Service` | `Terms of Service \| Text Humanica` | 34 | ✅ OK |
| `src/app/dashboard/layout.tsx` | `Dashboard` | `Dashboard \| Text Humanica` | 26 | ✅ OK (noIndex) |
| `src/app/auth/layout.tsx` | `Authentication` | `Authentication \| Text Humanica` | 32 | ✅ OK |

**Blog posts** (title = `post.title` from `seo-content.ts`):

| Slug | Post title | Full title chars | Status |
|---|---|---|---|
| `best-ai-detector-and-humanizer` | `Best AI Detector and Humanizer in 2026 (Tested and Ranked)` | `Best AI Detector and Humanizer in 2026 (Tested and Ranked) \| Text Humanica` | **76** | ❌ |
| `free-ai-detector-and-humanizer` | `Best Free AI Detector and Humanizer Tools (No Sign Up Required)` | `Best Free AI Detector and Humanizer Tools (No Sign Up Required) \| Text Humanica` | **80** | ❌ |
| `how-to-humanize-ai-text` | `How to Humanize AI Text: The Complete 2026 Guide` | `How to Humanize AI Text: The Complete 2026 Guide \| Text Humanica` | **65** | ❌ |
| `ai-detector-for-students` | `Best AI Detector for Students: GPTZero vs Turnitin vs Text Humanica` | `Best AI Detector for Students: GPTZero vs Turnitin vs Text Humanica \| Text Humanica` | **85** | ❌ |
| `bypass-gptzero` | `How to Bypass GPTZero in 2026 (Tested Methods That Work)` | `How to Bypass GPTZero in 2026 (Tested Methods That Work) \| Text Humanica` | **73** | ❌ |
| `ai-humanizer-for-seo-writers` | `Best AI Humanizer for SEO Writers: Rank Without Getting Flagged` | `Best AI Humanizer for SEO Writers: Rank Without Getting Flagged \| Text Humanica` | **80** | ❌ |
| `undetectable-ai-text` | `How to Make AI Text Undetectable in 2026 (Complete Guide)` | `How to Make AI Text Undetectable in 2026 (Complete Guide) \| Text Humanica` | **74** | ❌ |
| `ai-detector-accuracy` | `How Accurate Are AI Detectors? (2026 Independent Test Results)` | `How Accurate Are AI Detectors? (2026 Independent Test Results) \| Text Humanica` | **79** | ❌ |

**Tool comparison pages** (`toolPages` in `seo-content.ts`, title = `page.title`):

| Slug | Title | Full chars | Status |
|---|---|---|---|
| `vs-gptzero` | `Text Humanica vs GPTZero: Which AI Detector Is More Accurate?` | `Text Humanica vs GPTZero: Which AI Detector Is More Accurate? \| Text Humanica` | **78** | ❌ |
| `vs-turnitin` | `Text Humanica vs Turnitin AI Detector: What Students Need to Know` | `... \| Text Humanica` | **82** | ❌ |
| `vs-originality-ai` | `Text Humanica vs Originality.ai: Best AI Detector for Content Teams` | `... \| Text Humanica` | **84** | ❌ |
| `vs-grammarly` | `Text Humanica vs Grammarly AI Detector: Which Should You Use?` | `... \| Text Humanica` | **77** | ❌ |
| `vs-quillbot` | `Text Humanica vs QuillBot: Better AI Humanizer and Detector?` | `... \| Text Humanica` | **77** | ❌ |
| `vs-undetectable-ai` | `Text Humanica vs Undetectable AI: Which Humanizer Is Better?` | `... \| Text Humanica` | **77** | ❌ |

**pSEO pages** — `slugToTitle` in `src/lib/pseo-slugs.ts`:
```ts
return `${kw} — Free AI Humanizer | Text Humanica`;
//                                 ^--- already includes "| Text Humanica"
```
The full title is `${kw} — Free AI Humanizer | Text Humanica`.
`" — Free AI Humanizer | Text Humanica"` = 37 chars. Ahrefs limit ≈ 60 chars.
That leaves only **23 chars** for `kw` before exceeding 60.
Almost every slug keyword is longer than 23 chars → **virtually all pSEO titles are too long**.

Example: `"2026 academic writing humanization techniques — Free AI Humanizer | Text Humanica"` = 83 chars.

The template itself is the problem. The `| Text Humanica` suffix is already in the template,
so `buildMetadata` is NOT called for pSEO pages — the `generateMetadata` in pseo page returns
the literal string from `slugToTitle`. This title string is the raw `<title>` tag value.

### Fixes

#### Fix 2a — `src/app/humanize/page.tsx`
Content change.
```
OLD: title: "AI Humanizer to Bypass GPTZero & Humanize ChatGPT Text"
NEW: title: "AI Humanizer — Bypass GPTZero & Humanize AI Text"
```
Full title becomes: `AI Humanizer — Bypass GPTZero & Humanize AI Text | Text Humanica` = 65 chars.
Further shorten: `AI Humanizer — Bypass GPTZero, Humanize AI Text` → 47 raw chars → 63 full. ✅

#### Fix 2b — `src/app/tools/page.tsx`
Content change.
```
OLD: title: "Text Humanica vs Other AI Detectors & Humanizers"
NEW: title: "AI Humanizer vs Detectors & Humanizers"
```
Full title: `AI Humanizer vs Detectors & Humanizers | Text Humanica` = 54 chars. ✅

#### Fix 2c — `src/lib/seo-content.ts` — Blog post titles
Content change. Edit the `title` field in the matching `BlogPost` objects:

| Slug | New title (≤ 44 raw chars) | New full title |
|---|---|---|
| `best-ai-detector-and-humanizer` | `Best AI Detector and Humanizer 2026` | `Best AI Detector and Humanizer 2026 \| Text Humanica` (52) ✅ |
| `free-ai-detector-and-humanizer` | `Best Free AI Detector and Humanizer` | `Best Free AI Detector and Humanizer \| Text Humanica` (52) ✅ |
| `how-to-humanize-ai-text` | `How to Humanize AI Text (2026 Guide)` | `How to Humanize AI Text (2026 Guide) \| Text Humanica` (53) ✅ |
| `ai-detector-for-students` | `Best AI Detector for Students 2026` | `Best AI Detector for Students 2026 \| Text Humanica` (51) ✅ |
| `bypass-gptzero` | `How to Bypass GPTZero in 2026` | `How to Bypass GPTZero in 2026 \| Text Humanica` (47) ✅ |
| `ai-humanizer-for-seo-writers` | `Best AI Humanizer for SEO Writers` | `Best AI Humanizer for SEO Writers \| Text Humanica` (50) ✅ |
| `undetectable-ai-text` | `How to Make AI Text Undetectable 2026` | `How to Make AI Text Undetectable 2026 \| Text Humanica` (54) ✅ |
| `ai-detector-accuracy` | `How Accurate Are AI Detectors? 2026` | `How Accurate Are AI Detectors? 2026 \| Text Humanica` (52) ✅ |

#### Fix 2d — `src/lib/seo-content.ts` — Tool comparison page titles
Content change. Edit the `title` field in the matching `ToolPage` objects:

| Slug | New title | New full title |
|---|---|---|
| `vs-gptzero` | `Text Humanica vs GPTZero: Accuracy Compared` | `Text Humanica vs GPTZero: Accuracy Compared \| Text Humanica` (60) ✅ |
| `vs-turnitin` | `Text Humanica vs Turnitin: What Students Need` | `Text Humanica vs Turnitin: What Students Need \| Text Humanica` (62) — trim to `Text Humanica vs Turnitin AI Detector` (38 raw → 54) ✅ |
| `vs-originality-ai` | `Text Humanica vs Originality.ai Compared` | `Text Humanica vs Originality.ai Compared \| Text Humanica` (57) ✅ |
| `vs-grammarly` | `Text Humanica vs Grammarly AI Detector` | `Text Humanica vs Grammarly AI Detector \| Text Humanica` (55) ✅ |
| `vs-quillbot` | `Text Humanica vs QuillBot: Humanizer Test` | `Text Humanica vs QuillBot: Humanizer Test \| Text Humanica` (58) ✅ |
| `vs-undetectable-ai` | `Text Humanica vs Undetectable AI Compared` | `Text Humanica vs Undetectable AI Compared \| Text Humanica` (58) ✅ |

#### Fix 2e — `src/lib/pseo-slugs.ts` — pSEO title template
Code change. Shorten the `slugToTitle` template so the longest common keywords fit.
The current template adds 37 chars of suffix. Change it to add only 22 chars:

```ts
// OLD
export function slugToTitle(slug: string): string {
  const kw = slugToKeyword(slug);
  return `${kw} — Free AI Humanizer | Text Humanica`;
}

// NEW
export function slugToTitle(slug: string): string {
  const kw = slugToKeyword(slug);
  // Keep full title under 60 chars; the "| Text Humanica" is omitted here
  // because generateMetadata in pseo/[slug]/page.tsx returns `title` as-is
  // (not via buildMetadata), so no suffix is appended automatically.
  // Template: "{kw} | Free AI Humanizer" — suffix is 21 chars, leaves 39 for kw.
  const MAX_KW = 39;
  const shortKw = kw.length > MAX_KW ? kw.slice(0, MAX_KW - 1) + "…" : kw;
  return `${shortKw} | Free AI Humanizer`;
}
```

> **Important:** The pSEO `generateMetadata` returns `{ title }` (a raw string), NOT via
> `buildMetadata`, so the browser `<title>` will be exactly what `slugToTitle` returns. The
> `| Text Humanica` in the old template is the literal title — there is no second suffix.
> Changing to `| Free AI Humanizer` (21 chars suffix) caps the title at 60 chars for all
> but a handful of very long slugs, for which the truncation fallback above applies.

---

## Issue 3 — Meta Descriptions Too Short (< 120 chars)

### Audit

| File / source | Description | Chars | Status |
|---|---|---|---|
| `src/app/page.tsx` | `"Humanize AI text and rewrite ChatGPT drafts into natural, polished, plagiarism-free writing."` | 93 | ❌ SHORT |
| `src/app/layout.tsx` | `"Humanize AI text, bypass GPTZero-style flags, and manage your writing workflow in one polished AI workspace."` | 107 | ❌ SHORT |
| `src/app/cookies/page.tsx` | `"Learn how Text Humanica uses cookies and how to manage your preferences."` | 72 | ❌ SHORT |
| `src/app/account/page.tsx` | `"Manage your profile details, Google sign-in identity, and password settings."` | 77 | ❌ SHORT (noIndex — lower priority) |

> The other pages all have descriptions ≥ 120 chars. Verify using these counts:
> - `faq/page.tsx`: ~128 chars ✅
> - `contact/page.tsx`: ~122 chars ✅
> - `pricing/layout.tsx`: ~131 chars ✅
> - `humanize/page.tsx`: ~124 chars ✅

### Fixes

#### Fix 3a — `src/app/page.tsx`
Content change.
```
OLD: "Humanize AI text and rewrite ChatGPT drafts into natural, polished, plagiarism-free writing."
NEW: "Humanize AI text from ChatGPT, Claude, or Gemini into natural, polished writing that bypasses GPTZero, Turnitin, and Originality.ai detection."
```
(141 chars ✅)

#### Fix 3b — `src/app/layout.tsx`
Content change.
```
OLD: "Humanize AI text, bypass GPTZero-style flags, and manage your writing workflow in one polished AI workspace."
NEW: "Humanize AI text, bypass GPTZero-style flags, and manage your entire writing workflow in one polished AI workspace. Free plan available, no credit card required."
```
(162 chars ✅)

#### Fix 3c — `src/app/cookies/page.tsx`
Content change.
```
OLD: "Learn how Text Humanica uses cookies and how to manage your preferences."
NEW: "Learn how Text Humanica uses cookies, what data we store, and how to manage or disable your cookie preferences at any time from your browser."
```
(141 chars ✅)

#### Fix 3d — `src/app/account/page.tsx` (noIndex, lower priority but include for completeness)
Content change.
```
OLD: "Manage your profile details, Google sign-in identity, and password settings."
NEW: "Manage your Text Humanica profile: update your display name, Google sign-in identity, password settings, and API key access."
```
(123 chars ✅)

---

## Issue 4 — Pages With Only One Inbound Dofollow Internal Link

### Findings
The footer (`src/components/layout/Footer.tsx`) links to:
- Product: `/humanize`, `/detectors`, `/pricing`
- Resources: `/blog`, `/tools`, `/use-cases`, `/faq`, `/contact`
- Legal: `/privacy`, `/terms`, `/cookies`

The footer does **not** link to `/detectors` — wait, it does. Let me re-check.
Actually, the footer Product column has: Humanizer (`/humanize`), AI Detector (`/detectors`), Pricing (`/pricing`).

Pages most likely to be under-linked (Ahrefs flags pages with ≤ 1 inbound dofollow link):

1. **`/detectors`** — the footer links here as "AI Detector" in the Product column, but this is the
   only internal link found. No blog post, tool page, or use-case page links to `/detectors`.

2. **`/humanize`** — linked from footer and from CTA buttons in many pages; likely fine.
   The second candidate is probably **`/auth/signup`** or **`/cookies`**. Since `/detectors` is
   the most isolated content page, and the pSEO pages currently have no link to `/detectors`,
   this and another isolated page are the two Ahrefs flagged.

   The second under-linked page is most likely **`/use-cases`** — it is only reachable from the
   footer "Use Cases" link and from within use-case pages themselves (the index page is not
   linked from blog posts or tool comparison pages).

### Fixes

#### Fix 4a — Add `/detectors` link to blog posts
Content change in `src/lib/seo-content.ts`.

In the `how-to-humanize-ai-text` post, `sections[4]` ("Related guides"), add a link:
```
// Add to the body text:
"...and [Text Humanica's supported detectors list](/detectors) for the full bypass breakdown."
```

In the `bypass-gptzero` post, `sections[4]` ("What does not work"), add at the end:
```
"...Check the [detectors page](/detectors) to see bypass rates for every major tool."
```

#### Fix 4b — Add `/use-cases` link to blog posts
Content change in `src/lib/seo-content.ts`.

In the `ai-detector-for-students` post, `sections[3]` ("How to check your own work"), add at end:
```
"See also [AI humanizer use cases for students](/use-cases/for-students) for the full academic workflow."
```

In the `ai-humanizer-for-seo-writers` post, `sections[0]` bullets, add a bullet:
```
"See the [use cases for SEO writers](/use-cases/for-seo-writers) for a full workflow breakdown."
```

#### Fix 4c — Add `/detectors` to the pSEO page "Keep reading" feature bullets
Code change in `src/app/tools/pseo/[slug]/page.tsx`.

The feature bullets list hardcodes 6 bullets. Add a 7th:
```tsx
"Check your result against our supported AI detectors — built-in score in the same interface",
```
And below the feature bullets section, add a `Link` to `/detectors`:
```tsx
<p className="mt-4 text-sm text-slate-500">
  See all{" "}
  <Link href="/detectors" className="text-indigo-600 hover:underline">
    AI detectors we help you bypass
  </Link>.
</p>
```

---

## Issue 5 — H1 Tag Missing or Empty

### Audit

| File | H1 present? | Notes |
|---|---|---|
| `src/app/faq/page.tsx` | ✅ Yes | `<h1>Frequently asked questions</h1>` in `<header>` |
| `src/app/contact/page.tsx` | ✅ Yes | `<h1>We&apos;re here to help</h1>` in left panel |
| `src/app/account/page.tsx` | ❌ **Missing** | The page renders `<AccountPageClient />` — component has no H1 |
| `src/app/blog/[slug]/page.tsx` | ✅ Yes | `<h1>{post.title}</h1>` in `<header>` |
| `src/app/tools/pseo/[slug]/page.tsx` | ✅ Yes | `<h1>{h1}</h1>` where `h1 = slugToH1(slug)` |
| `src/app/use-cases/[usecase]/page.tsx` | ✅ Yes | `<h1>{page.headline}</h1>` |
| `src/app/pricing/page.tsx` | ❌ **Missing** | The page is `"use client"` and renders `<PricingCardsSection />`. `PricingCardsSection` renders a dynamic heading using `headingLevel = "h1"` prop but **the default `headingLevel` is `"h1"`**, so the `<Heading>` (= `h1`) renders `"Simple, transparent pricing"`. However, the `<main>` wrapper in `layout.tsx` wraps all pages — the H1 **IS** rendered by PricingCardsSection because `headingLevel` defaults to `"h1"`. ✅ Actually present. |
| `src/app/humanize/page.tsx` | ❌ **Missing** | Renders `<HumanizerPageClient />` which has no H1 (tool UI, no visible heading) |

So the **2 pages with missing H1** are:
1. **`/account`** — `AccountPageClient` has no H1
2. **`/humanize`** — `HumanizerPageClient` has no H1

> Note: Both are app-like UIs (not content pages). Ahrefs flags them because the crawler
> sees no H1 in the rendered HTML.

### Fixes

#### Fix 5a — `src/app/account/page.tsx`
Code change. The `AccountPage` server component already has a `StructuredData` tag. Add a visually
hidden (screen-reader accessible) H1 before `<AccountPageClient />`:

```tsx
export default function AccountPage() {
  return (
    <>
      <StructuredData
        data={buildBreadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Manage Account", path: "/account" },
        ])}
      />
      {/* H1 for SEO — visually hidden, preserves visual design */}
      <h1 className="sr-only">Manage Account</h1>
      <AccountPageClient />
    </>
  );
}
```

This is a code change (add one JSX element). It adds an accessible, SEO-visible H1 without
altering the visible UI.

#### Fix 5b — `src/app/humanize/page.tsx`
Code change. Add a visually hidden H1 before the client component:

```tsx
export default function HumanizePage() {
  return (
    <>
      <StructuredData
        data={buildBreadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Humanizer", path: "/humanize" },
        ])}
      />
      {/* H1 for SEO — visually hidden so it does not disrupt the tool UI */}
      <h1 className="sr-only">AI Humanizer — Bypass GPTZero, Humanize AI Text</h1>
      <Suspense fallback={<div className="p-10 text-slate-400">Loading humanizer...</div>}>
        <HumanizerPageClient />
      </Suspense>
    </>
  );
}
```

---

## Issue 6 — HTTP to HTTPS

### Findings
Shell search (`Get-ChildItem … | Select-String -Pattern "http://texthumanica"`) returned
**no matches** across all `.tsx` and `.ts` files in `src/`.

The pSEO page uses `https://texthumanica.com` hardcoded. No `http://` usage exists in source.

**The Ahrefs notice is caused by an external link pointing to the `http://` version of the
domain.** The server (Vercel) issues a 301 redirect to HTTPS automatically. No source file
needs changing for this issue.

**Optional belt-and-suspenders fix** — add `Strict-Transport-Security` header via `next.config.ts`:

```ts
// next.config.ts — add inside nextConfig
async headers() {
  return [
    {
      source: "/:path*",
      headers: [
        {
          key: "Strict-Transport-Security",
          value: "max-age=63072000; includeSubDomains; preload",
        },
      ],
    },
  ];
},
```

This ensures the browser never makes a plain HTTP request after the first visit, eliminating
the crawl-time redirect entirely. Config change in `next.config.ts`.

---

## Issue 7 — Structured Data Errors

### Findings per schema type

#### FAQPage (`src/lib/seo.ts` — `buildFaqJsonLd`)
```ts
mainEntity: entries.map((entry) => ({
  "@type": "Question",
  name: entry.question,
  acceptedAnswer: {
    "@type": "Answer",
    text: entry.answer,
  },
}))
```
**Required fields per schema.org:**
- `Question`: `@type`, `name` ✅ (present), `acceptedAnswer` ✅
- `Answer`: `@type` ✅, `text` ✅

**Verdict: ✅ Correct.** All required fields are present.

#### BreadcrumbList (`src/lib/seo.ts` — `buildBreadcrumbJsonLd`)
```ts
itemListElement: items.map((item, index) => ({
  "@type": "ListItem",
  position: index + 1,
  name: item.name,
  item: absoluteUrl(item.path),
}))
```
**Required fields per schema.org:**
- `ListItem`: `@type` ✅, `position` ✅, `name` ✅, `item` ✅ (the URL)

**Verdict: ✅ Correct.** All required fields are present.

#### Organization (`src/lib/seo.ts` — `buildOrganizationJsonLd`)
```ts
{
  "@type": "Organization",
  name: siteConfig.name,    // ✅
  url: siteConfig.url,      // ✅
  logo: absoluteUrl(siteConfig.logo),  // logo is "/logo-icon.png" → a relative path string
  sameAs: [...],
}
```
**Issue found:** `logo` should be an `ImageObject`, not a plain URL string.
Google's structured data guidelines require:
```json
"logo": {
  "@type": "ImageObject",
  "url": "https://texthumanica.com/logo-icon.png"
}
```
Currently it is just: `"logo": "https://texthumanica.com/logo-icon.png"` (a string).
This fails Google's Rich Results validator.

**Fix 7a — `src/lib/seo.ts`**
Code change. In `buildOrganizationJsonLd`:
```ts
// OLD
logo: absoluteUrl(siteConfig.logo),

// NEW
logo: {
  "@type": "ImageObject",
  url: absoluteUrl(siteConfig.logo),
},
```

#### SoftwareApplication (`src/lib/seo.ts` — `buildSoftwareApplicationJsonLd`)
```ts
{
  "@type": "SoftwareApplication",
  name, applicationCategory, operatingSystem, url, image, description,
  offers: { "@type": "AggregateOffer", priceCurrency, lowPrice, highPrice, offerCount }
}
```
**Required fields per schema.org:**
- `name` ✅, `applicationCategory` ✅, `operatingSystem` ✅

**`offers.offerCount`** should be a number, not a number — it is `6` (number) ✅.
**`image`** is `absoluteUrl(siteConfig.logo)` — a URL string. For `SoftwareApplication`,
`image` can be a URL string or an `ImageObject`. A plain URL is accepted. ✅

**Verdict: ✅ Correct.**

#### Article (`src/app/blog/[slug]/page.tsx` — `buildArticleJsonLd`)
```ts
{
  "@type": "Article",
  headline: post.title,       // ✅
  description: post.description, // ✅
  datePublished: post.publishedAt, // ✅
  dateModified: post.updatedAt,    // ✅
  author: buildPersonJsonLd(siteConfig.author), // ✅ Person object
  publisher: {
    "@type": "Organization",
    name: siteConfig.name,    // ✅
    logo: { "@type": "ImageObject", url: absoluteUrl(siteConfig.logo) }, // ✅
  },
  mainEntityOfPage: { "@type": "WebPage", "@id": absoluteUrl(...) }, // ✅
}
```
**Required fields per schema.org:**
- `headline` ✅, `author` ✅, `datePublished` ✅, `publisher` ✅

**Issue found:** `post.publishedAt` and `post.updatedAt` are stored as `"2026-01-15"`
(date only, no time component). Google recommends full ISO 8601 datetime strings
(`"2026-01-15T00:00:00Z"`). Date-only strings pass validation but may reduce rich result
eligibility.

**Fix 7b — `src/lib/seo-content.ts`** (optional, recommended)
Content change. Append `T00:00:00Z` to all `publishedAt` and `updatedAt` values, or handle
this in `buildArticleJsonLd`:

```ts
// In buildArticleJsonLd in src/app/blog/[slug]/page.tsx
datePublished: post.publishedAt.includes("T") ? post.publishedAt : `${post.publishedAt}T00:00:00Z`,
dateModified:  post.updatedAt.includes("T")   ? post.updatedAt   : `${post.updatedAt}T00:00:00Z`,
```

This is a code change in `src/app/blog/[slug]/page.tsx`, not in `seo-content.ts`.
It is non-breaking (safe for existing date strings that already include time).

#### pSEO inline JSON-LD (`src/app/tools/pseo/[slug]/page.tsx`)
```json
{
  "@graph": [
    { "@type": "WebPage", name, url, description, isPartOf },
    {
      "@type": "FAQPage",
      "mainEntity": [
        { "@type": "Question", "name": "...", "acceptedAnswer": { "@type": "Answer", "text": "..." } }
      ]
    }
  ]
}
```
**FAQPage:**
- `Question.name` ✅, `acceptedAnswer.@type` ✅, `acceptedAnswer.text` ✅

**WebPage:**
- `name` ✅, `url` ✅, `description` ✅, `isPartOf` ✅

**Verdict: ✅ Correct.** No errors in pSEO structured data.

---

## Summary of All Changes by File

| # | File | Change type | Issue(s) addressed |
|---|---|---|---|
| 1 | `next.config.ts` | Config | Issue 1 (www redirect), Issue 6 (HSTS header) |
| 2 | `src/app/humanize/page.tsx` | Content + Code | Issue 2a (title), Issue 5b (H1) |
| 3 | `src/app/tools/page.tsx` | Content | Issue 2b (title) |
| 4 | `src/lib/seo-content.ts` | Content | Issue 2c (blog titles), Issue 2d (tool titles), Issue 4a/4b (cross-links) |
| 5 | `src/lib/pseo-slugs.ts` | Code | Issue 2e (pSEO title template) |
| 6 | `src/app/page.tsx` | Content | Issue 3a (description) |
| 7 | `src/app/layout.tsx` | Content | Issue 3b (description) |
| 8 | `src/app/cookies/page.tsx` | Content | Issue 3c (description) |
| 9 | `src/app/account/page.tsx` | Content | Issue 3d (description), Issue 5a (H1) |
| 10 | `src/app/tools/pseo/[slug]/page.tsx` | Code | Issue 4c (cross-link to /detectors) |
| 11 | `src/lib/seo.ts` | Code | Issue 7a (Organization logo ImageObject) |
| 12 | `src/app/blog/[slug]/page.tsx` | Code | Issue 7b (ISO 8601 dates) |

---

## Implementation Plan (ordered by dependency)

- [ ] 1. Fix `buildOrganizationJsonLd` logo field.
      **File:** `src/lib/seo.ts`
      Change `logo: absoluteUrl(siteConfig.logo)` to `logo: { "@type": "ImageObject", url: absoluteUrl(siteConfig.logo) }`.
      This is used globally (layout.tsx) — fix it first so it propagates everywhere.
      **Verify:** Run `npm run build` — no TypeScript errors.

- [ ] 2. Fix Article datePublished/dateModified to full ISO 8601 format.
      **File:** `src/app/blog/[slug]/page.tsx`
      In `buildArticleJsonLd`, replace `post.publishedAt` / `post.updatedAt` with the `includes("T")` guard expression documented above.
      **Verify:** `npm run build` passes. Paste a rendered blog post JSON-LD into Google's Rich Results Test.

- [ ] 3. Shorten all over-length blog post `title` fields.
      **File:** `src/lib/seo-content.ts`
      Apply Fix 2c: update 8 blog `title` strings to their shorter equivalents from the table above.
      **Verify:** `npm run build` passes. Each blog title + " | Text Humanica" must be ≤ 60 chars.

- [ ] 4. Shorten all over-length tool comparison `title` fields.
      **File:** `src/lib/seo-content.ts`
      Apply Fix 2d: update 6 tool page `title` strings.
      **Verify:** `npm run build` passes.

- [ ] 5. Add cross-links to `/detectors` and `/use-cases` in blog post body text.
      **File:** `src/lib/seo-content.ts`
      Apply Fix 4a (add `/detectors` link to 2 posts) and Fix 4b (add `/use-cases` links to 2 posts).
      These are content changes inside existing `body` strings — use markdown link syntax `[text](/path)` which `renderInline` in `blog/[slug]/page.tsx` already handles.
      **Verify:** `npm run build` passes. Visit the relevant blog pages and confirm the new links appear.

- [ ] 6. Fix pSEO title template to keep titles ≤ 60 chars.
      **File:** `src/lib/pseo-slugs.ts`
      Apply Fix 2e: rewrite `slugToTitle` with the truncation guard.
      **Verify:** `npm run build` passes. Manually check: `slugToTitle("2026-academic-writing-humanization-techniques")` returns a string ≤ 60 chars.

- [ ] 7. Shorten humanize page title and fix its meta description.
      **File:** `src/app/humanize/page.tsx`
      Apply Fix 2a (title) and Fix 3a-equivalent: confirm description is already 124 chars (✅ per audit).
      Title change: `"AI Humanizer to Bypass GPTZero & Humanize ChatGPT Text"` → `"AI Humanizer — Bypass GPTZero, Humanize AI Text"`.
      **Verify:** `npm run build` passes.

- [ ] 8. Add H1 to `/humanize` page.
      **File:** `src/app/humanize/page.tsx`
      Apply Fix 5b: add `<h1 className="sr-only">AI Humanizer — Bypass GPTZero, Humanize AI Text</h1>` before `<Suspense>`. H1 text should match the new title from step 7.
      **Verify:** `npm run build` passes. Inspect page source and confirm `<h1 class="sr-only">` is present.

- [ ] 9. Fix tools index page title.
      **File:** `src/app/tools/page.tsx`
      Apply Fix 2b: `title: "AI Humanizer vs Detectors & Humanizers"`.
      **Verify:** `npm run build` passes.

- [ ] 10. Fix `/` homepage meta description.
       **File:** `src/app/page.tsx`
       Apply Fix 3a: replace short description with the 141-char version.
       **Verify:** `npm run build` passes.

- [ ] 11. Fix root layout meta description.
       **File:** `src/app/layout.tsx`
       Apply Fix 3b: replace 107-char description with 162-char version.
       **Verify:** `npm run build` passes.

- [ ] 12. Fix cookie policy meta description.
       **File:** `src/app/cookies/page.tsx`
       Apply Fix 3c: replace 72-char description with 141-char version.
       **Verify:** `npm run build` passes.

- [ ] 13. Fix account page description and add H1.
       **File:** `src/app/account/page.tsx`
       Apply Fix 3d (longer description) and Fix 5a (add `<h1 className="sr-only">Manage Account</h1>`).
       **Verify:** `npm run build` passes. Inspect page source.

- [ ] 14. Add `/detectors` cross-link to pSEO pages.
       **File:** `src/app/tools/pseo/[slug]/page.tsx`
       Apply Fix 4c: add a `<Link href="/detectors">` paragraph below the feature bullets section.
       **Verify:** `npm run build` passes. Load any pSEO page and confirm the link is visible.

- [ ] 15. Add HSTS header and www→apex redirect to Next.js config.
       **File:** `next.config.ts`
       Apply Fixes from Issues 1 and 6: add `redirects()` for `www.texthumanica.com` → `texthumanica.com`, and `headers()` for HSTS.
       **Verify:** `npm run build` passes. Confirm no TypeScript errors in the config file.

---

## Notes and Assumptions

1. **The `/pricing` page H1** — `PricingCardsSection` renders `<h1>Simple, transparent pricing</h1>`
   by default (`headingLevel = "h1"`). This H1 is present. If Ahrefs flagged pricing, it may have
   been from a previous crawl before this component was added. No fix needed.

2. **No `http://texthumanica` links exist** in source code. Issues 1 and 6 as reported by Ahrefs
   are caused by external inbound links or the hosting redirect chain, not by source code.

3. **pSEO pages**: `generateMetadata` in `src/app/tools/pseo/[slug]/page.tsx` returns `{ title }`
   as a raw string — it does NOT call `buildMetadata`. So the title IS the full browser title,
   and there is no `| Text Humanica` suffix being appended automatically.
   The `slugToTitle` template already includes `| Text Humanica` in the string, which is why
   every pSEO page title is very long. Fix 2e addresses this.

4. **`use-cases/[usecase]/page.tsx`** and **`blog/[slug]/page.tsx`** call `buildMetadata`
   with `title: page.title` / `title: post.title`, so the full browser title is
   `${page.title} | Text Humanica`. The title budget is 44 chars for the raw value.

5. **Verification command** throughout: `npm run build` (standard Next.js build check).
   For structured data, additionally use Google's Rich Results Test at
   https://search.google.com/test/rich-results with the live URL after deployment.
