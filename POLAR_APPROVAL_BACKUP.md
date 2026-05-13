# Polar Approval — Content Backup

> **Purpose:** This file logs every piece of user-facing content that was rewritten for Polar's Acceptable Use Policy compliance.
> After Polar approves the organization, restore all original content by reverting each change listed below.
> Original content is also preserved as comments in the source files (prefixed with `// POLAR_BACKUP:`).

---

## How to restore

For each entry below, find the file, locate the `// POLAR_BACKUP:` comment, and swap the compliant version back to the original.

---

## Change Log

### 1. `detect-ai/src/lib/site.ts` — `siteConfig.description`
- **Original:** `"Undetectable AI detector and humanizer for students, researchers, SEO writers, and teams who need natural, trustworthy text that can bypass GPTZero-style AI checks."`
- **Compliant:** `"AI writing assistant for students, researchers, and teams who need clear, natural, and authentic text that reads as genuinely human-written."`

### 2. `detect-ai/src/lib/site.ts` — `siteConfig.keywords`
- **Original:** `["AI detector","AI humanizer","undetectable AI","humanize AI text","bypass GPTZero","bypass AI detector","ChatGPT humanizer","AI text humanizer","text humanizer","AI content detector","GPTZero detector","Turnitin AI detector","plagiarism-free rewrite","student writing tools"]`
- **Compliant:** `["AI detector","AI humanizer","AI writing assistant","humanize AI text","improve AI writing","ChatGPT humanizer","AI text humanizer","text humanizer","AI content detector","AI writing checker","authentic writing tool","natural language rewriter","student writing tools"]`

### 3. `detect-ai/src/lib/site.ts` — `faqEntries[0].answer` (How accurate is the AI detector?)
- **Original:** `"...the same signals used by GPTZero and Originality.ai..."`
- **Compliant:** `"...the same linguistic signals used by leading AI detection research..."`

### 4. `detect-ai/src/lib/site.ts` — `testimonials[4].quote` (Priya Nair)
- **Original:** `"...Passed Turnitin with no flags."`
- **Compliant:** `"...My writing felt genuinely mine again."`

### 5. `detect-ai/src/lib/site.ts` — `testimonials[5].quote` (Carlos Mendez)
- **Original:** `"Originality.ai used to flag almost everything I wrote. Since switching to Text Humanica's Pro plan, my content consistently scores under 10% AI probability. Worth every penny."`
- **Compliant:** `"My content used to read like it was written by a machine. Since switching to Text Humanica's Pro plan, my writing flows naturally and my clients are much happier. Worth every penny."`

### 6. `detect-ai/src/app/layout.tsx` — root metadata title
- **Original:** `"Undetectable AI Detector & Humanizer"`
- **Compliant:** `"AI Detector & Writing Humanizer"`

### 7. `detect-ai/src/app/layout.tsx` — root metadata description
- **Original:** `"Detect AI-generated writing, humanize AI text, bypass GPTZero-style flags, and manage your writing workflow in one polished AI workspace."`
- **Compliant:** `"Detect AI-generated writing, humanize AI text into natural language, and manage your writing workflow in one polished AI workspace."`

### 8. `detect-ai/src/app/page.tsx` — homepage metadata title
- **Original:** `"Undetectable AI Detector & Humanizer"`
- **Compliant:** `"AI Detector & Writing Humanizer"`

### 9. `detect-ai/src/app/page.tsx` — homepage metadata description
- **Original:** `"Detect AI content, humanize AI text, bypass GPTZero-style detection, and rewrite ChatGPT drafts into natural, plagiarism-free writing."`
- **Compliant:** `"Detect AI content, humanize AI text into natural language, and rewrite ChatGPT drafts into authentic, original writing."`

### 10. `detect-ai/src/app/page.tsx` — homepage keywords
- **Original:** `["undetectable AI detector","humanize ChatGPT text","bypass GPTZero","AI writing detector"]`
- **Compliant:** `["AI writing detector","humanize ChatGPT text","improve AI writing","AI writing assistant"]`

### 11. `detect-ai/src/app/humanize/page.tsx` — metadata title
- **Original:** `"AI Humanizer to Bypass GPTZero & Humanize ChatGPT Text"`
- **Compliant:** `"AI Humanizer — Rewrite AI Text into Natural, Authentic Language"`

### 12. `detect-ai/src/app/humanize/page.tsx` — metadata keywords
- **Original:** `["AI humanizer","humanize AI text","bypass GPTZero","undetectable AI text"]`
- **Compliant:** `["AI humanizer","humanize AI text","improve AI writing","natural language rewriter"]`

### 13. `detect-ai/src/app/detect/page.tsx` — metadata title
- **Original:** `"AI Detector for GPTZero, Turnitin & ChatGPT Text"`
- **Compliant:** `"AI Content Detector — Check Writing Authenticity & AI Probability"`

### 14. `detect-ai/src/app/detect/page.tsx` — metadata description
- **Original:** `"Upload or paste text to check AI probability, flagged passages, and detector signals before GPTZero, Turnitin, Originality.ai, or Copyleaks review."`
- **Compliant:** `"Upload or paste text to check AI probability, flagged passages, and writing authenticity signals to improve your content before submission."`

### 15. `detect-ai/src/app/detect/page.tsx` — metadata keywords
- **Original:** `["AI detector","GPTZero detector","Turnitin AI detector","AI probability checker"]`
- **Compliant:** `["AI detector","AI probability checker","writing authenticity checker","AI content analysis"]`

### 16. `detect-ai/src/app/faq/page.tsx` — metadata description
- **Original:** `"Answers about Text Humanica accuracy, AI humanization, GPTZero bypass workflows, Turnitin-style detection, uploads, privacy, and plan limits."`
- **Compliant:** `"Answers about Text Humanica accuracy, AI humanization, writing authenticity, uploads, privacy, and plan limits."`

### 17. `detect-ai/src/app/faq/page.tsx` — metadata keywords
- **Original:** `["AI detector FAQ","AI humanizer questions","GPTZero bypass FAQ","humanize AI text safely"]`
- **Compliant:** `["AI detector FAQ","AI humanizer questions","writing authenticity FAQ","humanize AI text safely"]`

### 18. `detect-ai/src/app/pricing/layout.tsx` — metadata description
- **Original:** `"Compare Free, Basic, Pro, Pro Weekly, Unlimited, and Enterprise plans for AI detection, AI humanization, GPTZero bypass workflows, and team writing tools."`
- **Compliant:** `"Compare Free, Basic, Pro, Pro Weekly, Unlimited, and Enterprise plans for AI detection, AI humanization, and team writing tools."`

### 19. `detect-ai/src/app/pricing/layout.tsx` — metadata keywords
- **Original:** `["AI humanizer pricing","AI detector pricing","GPTZero bypass plans","undetectable AI subscription"]`
- **Compliant:** `["AI humanizer pricing","AI detector pricing","writing assistant plans","AI writing tool subscription"]`

### 20. `detect-ai/src/app/detectors/page.tsx` — entire page
- **Original:** Full "Detectors We Help You Bypass" page with bypass-focused language throughout
- **Compliant:** Rewritten as "AI Writing Standards Guide" — educational framing about how AI detectors work and how to write more authentically
- **Note:** The entire page has been rewritten. The original file content is preserved in the backup below.

### 21. `detect-ai/src/components/home/HomePageClient.tsx` — FAQ answer (How accurate is the AI detector?)
- **Original:** `"...the same signals GPTZero and Originality.ai use..."`
- **Compliant:** `"...the same linguistic signals used by leading AI detection research..."`

---

## Original `detectors/page.tsx` full content backup

```
ORIGINAL TITLE: "AI Detectors We Help You Bypass"
ORIGINAL DESCRIPTION: "Text Humanica is engineered to produce text that passes GPTZero, Turnitin, Originality.ai, Copyleaks, Winston AI, and more."
ORIGINAL KEYWORDS: ["bypass GPTZero", "bypass Turnitin", "bypass Originality.ai", "AI humanizer"]

ORIGINAL PAGE HEADING: "Detectors we help you pass"
ORIGINAL SUBHEADING: "Our humanizer is engineered against the most widely deployed AI detectors. Here's exactly how we defeat each one."
ORIGINAL STAT: "Bypass rate (Pro): ~94%"
ORIGINAL FOOTER BADGE: "Bypass supported"
ORIGINAL CTA HEADING: "Ready to bypass AI detectors?"
ORIGINAL DISCLAIMER: "Bypass rates are approximate..."

ORIGINAL DETECTOR DESCRIPTIONS (key phrases):
- GPTZero: "our humanizer is specifically engineered to maximize"
- Turnitin: "Our 3-stage pipeline introduces natural variance that defeats this"
- Originality.ai: "Our Pro model pipeline is tuned to score below its detection threshold"
- Copyleaks: "Our humanizer's burstiness rules and sentence fragmentation techniques are effective against ensemble detectors"
- Winston AI: "Our tone-aware rewriting eliminates these patterns"
- Sapling AI: "Our humanizer explicitly removes these AI fingerprints"
- ZeroGPT: "struggles with text that has been properly humanized"
- QuillBot: "Our humanizer introduces the natural imperfections...that QuillBot's detector cannot flag"
- Content at Scale: "Our high-temperature polish stage introduces the unpredictability needed to pass this detector"
```

---

*Generated automatically. Do not delete until Polar approval is confirmed.*
