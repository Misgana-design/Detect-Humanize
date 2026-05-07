import type { Metadata } from "next";
import { StructuredData } from "@/components/seo/StructuredData";
import { buildBreadcrumbJsonLd, buildMetadata } from "@/lib/seo";
import { siteConfig } from "@/lib/site";

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({
    title: "Privacy Policy",
    description: "Read how Text Humanica handles user data, uploaded content, and account information.",
    path: "/privacy",
  });
}

export default function PrivacyPage() {
  const lastUpdated = "May 1, 2026";

  return (
    <>
      <StructuredData data={buildBreadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Privacy Policy", path: "/privacy" }])} />
      <div className="mx-auto max-w-3xl px-4 py-14">
        <header className="mb-10">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-indigo-600">Legal</p>
          <h1 className="mt-3 text-4xl font-extrabold tracking-tight text-slate-900">Privacy Policy</h1>
          <p className="mt-3 text-sm text-slate-500">Last updated: {lastUpdated}</p>
        </header>

        <div className="prose prose-slate max-w-none space-y-8 text-slate-700">

          <section>
            <h2 className="text-xl font-bold text-slate-900">1. Introduction</h2>
            <p>{siteConfig.name} ("we", "us", "our") is committed to protecting your privacy. This Privacy Policy explains what information we collect, how we use it, and your rights regarding your data when you use our Service at {siteConfig.url}.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900">2. Information We Collect</h2>
            <p><strong>Account information:</strong> When you register, we collect your name, email address, and authentication credentials. If you sign in with Google, we receive your name, email, and profile picture from Google.</p>
            <p className="mt-3"><strong>Text content:</strong> We store the text you submit for detection and humanization, along with the results, in your document history. This allows you to review and compare past work.</p>
            <p className="mt-3"><strong>Usage data:</strong> We track word usage counts to enforce plan quotas. We also log API request metadata (timestamps, plan tier, word counts) for billing and abuse prevention.</p>
            <p className="mt-3"><strong>Payment information:</strong> Payments are processed by Polar. We do not store your credit card details. We receive confirmation of payment status and subscription tier from Polar.</p>
            <p className="mt-3"><strong>Technical data:</strong> We may collect IP addresses, browser type, and device information for security and performance monitoring.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900">3. How We Use Your Information</h2>
            <ul className="mt-3 list-disc space-y-1 pl-6">
              <li>To provide, operate, and improve the Service</li>
              <li>To authenticate your identity and manage your account</li>
              <li>To enforce plan quotas and process billing</li>
              <li>To store your document history and detection results</li>
              <li>To respond to support requests</li>
              <li>To detect and prevent fraud, abuse, and security incidents</li>
              <li>To send transactional emails (account confirmation, password reset, billing receipts)</li>
            </ul>
            <p className="mt-3">We do not use your submitted text to train AI models. We do not sell your personal data to third parties.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900">4. Data Storage and Retention</h2>
            <p>Your data is stored in Supabase (PostgreSQL), hosted on AWS infrastructure. All data is encrypted at rest and in transit using TLS.</p>
            <p className="mt-3">We retain your account data and document history for as long as your account is active. If you delete your account, we will delete your personal data within 30 days, except where retention is required by law.</p>
            <p className="mt-3">Detection and humanization cache entries (keyed by content hash, not user identity) may be retained for up to 90 days to improve performance.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900">5. Third-Party Services</h2>
            <p>To operate the Service, we work with carefully selected third-party providers for infrastructure, authentication, payment processing, and AI computation. These providers process data only as necessary to deliver the Service and are bound by their own privacy and security commitments.</p>
            <p className="mt-3">We do not share your personal data with advertising networks, data brokers, or analytics platforms. We do not sell your data. Third-party providers are limited to processing data strictly for the purpose of providing the services we have contracted them for.</p>
            <p className="mt-3">If you have questions about specific providers we use, you may contact us via our <a href="/contact" className="text-indigo-600 hover:underline">contact page</a>.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900">6. Cookies</h2>
            <p>We use session cookies to maintain your authentication state. These are essential for the Service to function and cannot be disabled. We do not use advertising or tracking cookies.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900">7. Your Rights</h2>
            <p>Depending on your location, you may have the following rights regarding your personal data:</p>
            <ul className="mt-3 list-disc space-y-1 pl-6">
              <li><strong>Access:</strong> Request a copy of the personal data we hold about you</li>
              <li><strong>Correction:</strong> Update inaccurate or incomplete data via your account settings</li>
              <li><strong>Deletion:</strong> Request deletion of your account and associated data</li>
              <li><strong>Portability:</strong> Request your document history in a machine-readable format</li>
              <li><strong>Objection:</strong> Object to processing of your data in certain circumstances</li>
            </ul>
            <p className="mt-3">To exercise these rights, contact us via our <a href="/contact" className="text-indigo-600 hover:underline">contact page</a>.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900">8. Children's Privacy</h2>
            <p>The Service is not directed at children under 13. We do not knowingly collect personal data from children. If you believe a child has provided us with personal data, contact us and we will delete it promptly.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900">9. Changes to This Policy</h2>
            <p>We may update this Privacy Policy from time to time. We will notify you of material changes by email or by posting a notice on the Service. Continued use of the Service after changes take effect constitutes acceptance of the updated policy.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900">10. Contact</h2>
            <p>For privacy-related questions or requests, contact us at <a href="/contact" className="text-indigo-600 hover:underline">our contact page</a>.</p>
          </section>

        </div>
      </div>
    </>
  );
}
