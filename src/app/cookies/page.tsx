import type { Metadata } from "next";
import { buildBreadcrumbJsonLd, buildMetadata } from "@/lib/seo";
import { StructuredData } from "@/components/seo/StructuredData";

export async function generateMetadata(): Promise<Metadata> {
  return buildMetadata({
    title: "Cookie Policy",
    description: "Learn how Text Humanica uses cookies and how to manage your preferences.",
    path: "/cookies",
  });
}

export default function CookiePolicyPage() {
  const lastUpdated = "May 1, 2026";

  return (
    <>
      <StructuredData data={buildBreadcrumbJsonLd([{ name: "Home", path: "/" }, { name: "Cookie Policy", path: "/cookies" }])} />
      <div className="mx-auto max-w-3xl px-4 py-14">
        <header className="mb-10">
          <p className="text-sm font-bold uppercase tracking-[0.2em] text-indigo-600">Legal</p>
          <h1 className="mt-3 text-4xl font-extrabold tracking-tight text-slate-900">Cookie Policy</h1>
          <p className="mt-3 text-sm text-slate-500">Last updated: {lastUpdated}</p>
        </header>

        <div className="prose prose-slate max-w-none space-y-8 text-slate-700">

          <section>
            <h2 className="text-xl font-bold text-slate-900">What are cookies?</h2>
            <p>Cookies are small text files stored on your device when you visit a website. They help websites remember information about your visit, such as your login state and preferences, so you don&apos;t have to re-enter them every time.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900">How we use cookies</h2>
            <p>Text Humanica uses a minimal set of cookies. We do not use advertising cookies, cross-site tracking cookies, or third-party analytics cookies that profile your behavior across the web.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900">Types of cookies we use</h2>

            <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50">
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Type</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Purpose</th>
                    <th className="px-4 py-3 text-left font-semibold text-slate-700">Can be disabled?</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr>
                    <td className="px-4 py-3 font-medium text-slate-900">Essential</td>
                    <td className="px-4 py-3 text-slate-600">Maintain your login session and authentication state. Required for the Service to function.</td>
                    <td className="px-4 py-3 text-slate-500">No — required</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-medium text-slate-900">Functional</td>
                    <td className="px-4 py-3 text-slate-600">Remember your preferences such as cookie consent choices and UI settings.</td>
                    <td className="px-4 py-3 text-slate-500">Yes</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-medium text-slate-900">Analytics</td>
                    <td className="px-4 py-3 text-slate-600">Help us understand how users interact with the Service so we can improve it. Data is aggregated and anonymized.</td>
                    <td className="px-4 py-3 text-slate-500">Yes</td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-medium text-slate-900">Marketing</td>
                    <td className="px-4 py-3 text-slate-600">Used to measure the effectiveness of campaigns. We do not use third-party advertising cookies.</td>
                    <td className="px-4 py-3 text-slate-500">Yes</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900">Managing your preferences</h2>
            <p>You can update your cookie preferences at any time by clicking the cookie icon in the footer or by clearing your browser&apos;s local storage for this site. You can also configure your browser to block or delete cookies, though this may affect the functionality of the Service.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900">Session cookies vs. persistent cookies</h2>
            <p><strong>Session cookies</strong> are deleted when you close your browser. We use these for authentication tokens.</p>
            <p className="mt-3"><strong>Persistent cookies</strong> remain on your device for a set period. We use these to remember your consent preferences (stored in your browser&apos;s local storage, not as a traditional cookie).</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900">Changes to this policy</h2>
            <p>We may update this Cookie Policy from time to time. We will notify you of material changes by posting a notice on the Service.</p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-slate-900">Contact</h2>
            <p>For questions about our use of cookies, contact us via our <a href="/contact" className="text-indigo-600 hover:underline">contact page</a>.</p>
          </section>

        </div>
      </div>
    </>
  );
}
