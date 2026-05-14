import Link from "next/link";
import { Suspense } from "react";
import CopyrightYear from "./CopyRight";
import { Brand } from "./Brand";

const footerLinks = {
  Product: [
    { href: "/detector",  label: "AI Detector"       },
    { href: "/humanize",  label: "Humanizer"         },
    { href: "/detectors", label: "Detectors We Bypass"},
    { href: "/pricing",   label: "Pricing"           },
  ],
  Company: [
    { href: "/faq",     label: "FAQ"     },
    { href: "/contact", label: "Contact" },
  ],
  Legal: [
    { href: "/privacy", label: "Privacy" },
    { href: "/terms",   label: "Terms"   },
    { href: "/cookies", label: "Cookies" },
  ],
};

export default function Footer() {
  return (
    <footer className="border-t border-slate-200/80 bg-white">
      <div className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-4 lg:gap-8">
          {/* Brand */}
          <div className="lg:col-span-1">
            <Brand size="md" />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-slate-500">
              Detect AI content, humanize with confidence, and keep your writing
              workflow clean end-to-end.
            </p>
          </div>

          {/* Link columns */}
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h3 className="text-sm font-semibold text-slate-900">{category}</h3>
              <ul className="mt-4 space-y-3">
                {links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="text-sm text-slate-500 transition-colors hover:text-slate-700"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-12 flex items-center justify-between border-t border-slate-200/80 pt-8">
          <p className="text-sm text-slate-500">
            <Suspense fallback={<span>&copy; 2026</span>}>
              &copy;<CopyrightYear /> Text Humanica. All rights reserved.
            </Suspense>
          </p>
        </div>
      </div>
    </footer>
  );
}
