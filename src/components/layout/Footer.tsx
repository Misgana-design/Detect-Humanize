import Link from "next/link";
import CopyrightYear from "./CopyRight";
import { Suspense } from "react";

const footerLinks = {
  Product: [
    { href: "/detect", label: "AI Detection" },
    { href: "/humanize", label: "Humanizer" },
    { href: "/pricing", label: "Pricing" },
  ],
  Company: [
    { href: "#", label: "About" },
    { href: "#", label: "Blog" },
    { href: "#", label: "Contact" },
  ],
  Legal: [
    { href: "#", label: "Privacy" },
    { href: "#", label: "Terms" },
  ],
};

export default function Footer() {
  return (
    <footer className="border-t border-slate-200/80 bg-white">
      <div className="mx-auto max-w-7xl px-6 py-16">
        <div className="grid gap-12 md:grid-cols-2 lg:grid-cols-4 lg:gap-8">
          <div className="lg:col-span-1">
            <Link href="/" className="flex items-center gap-2.5">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-white text-sm font-semibold">
                AI
              </span>
              <span className="text-base font-semibold text-slate-900">
                AI Detect
              </span>
            </Link>
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-slate-500">
              Trust your content. Detect AI, humanize text, and stay authentic.
            </p>
          </div>
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h3 className="text-sm font-semibold text-slate-900">
                {category}
              </h3>
              <ul className="mt-4 space-y-3">
                {links.map((link, index) => (
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
            <Suspense fallback={<span>© 2026</span>}>
              ©<CopyrightYear /> All rights reserved.
            </Suspense>
          </p>
        </div>
      </div>
    </footer>
  );
}

// The world's most advanced AI detection and humanization platform.
//               Helping creators stay authentic in the age of AI.
