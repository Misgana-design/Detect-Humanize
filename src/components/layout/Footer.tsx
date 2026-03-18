import Link from "next/link";
import CopyrightYear from "./CopyRight";
import { Sparkles, Github, Twitter, Linkedin } from "lucide-react";
import { Suspense } from "react";

export default function Footer() {
  return (
    <footer className="bg-white border-t border-slate-100 pt-16 pb-8">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-12 mb-16">
          {/* Brand Column */}
          <div className="col-span-2 space-y-4">
            <Link href="/" className="flex items-center gap-2">
              <Sparkles className="text-indigo-600 w-6 h-6" />
              <span className="text-xl font-bold">AIGuard</span>
            </Link>
            <p className="text-slate-500 text-sm max-w-xs leading-relaxed">
              The world's most advanced AI detection and humanization platform.
              Helping creators stay authentic in the age of AI.
            </p>
            <div className="flex gap-4">
              <Twitter className="w-5 h-5 text-slate-400 hover:text-indigo-500 cursor-pointer transition-colors" />
              <Github className="w-5 h-5 text-slate-400 hover:text-indigo-500 cursor-pointer transition-colors" />
              <Linkedin className="w-5 h-5 text-slate-400 hover:text-indigo-500 cursor-pointer transition-colors" />
            </div>
          </div>

          {/* Links Columns */}
          <div>
            <h4 className="font-bold text-sm mb-4">Product</h4>
            <ul className="space-y-3 text-sm text-slate-500">
              <li>
                <Link
                  href="/detect"
                  className="hover:text-indigo-600 transition-colors"
                >
                  AI Detector
                </Link>
              </li>
              <li>
                <Link
                  href="/humanize"
                  className="hover:text-indigo-600 transition-colors"
                >
                  Humanizer
                </Link>
              </li>
              <li>
                <Link
                  href="/pricing"
                  className="hover:text-indigo-600 transition-colors"
                >
                  Pricing
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-sm mb-4">Company</h4>
            <ul className="space-y-3 text-sm text-slate-500">
              <li>
                <Link
                  href="#"
                  className="hover:text-indigo-600 transition-colors"
                >
                  About Us
                </Link>
              </li>
              <li>
                <Link
                  href="#"
                  className="hover:text-indigo-600 transition-colors"
                >
                  Blog
                </Link>
              </li>
              <li>
                <Link
                  href="#"
                  className="hover:text-indigo-600 transition-colors"
                >
                  Careers
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-sm mb-4">Legal</h4>
            <ul className="space-y-3 text-sm text-slate-500">
              <li>
                <Link
                  href="#"
                  className="hover:text-indigo-600 transition-colors"
                >
                  Privacy
                </Link>
              </li>
              <li>
                <Link
                  href="#"
                  className="hover:text-indigo-600 transition-colors"
                >
                  Terms
                </Link>
              </li>
              <li>
                <Link
                  href="#"
                  className="hover:text-indigo-600 transition-colors"
                >
                  Security
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-slate-50 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs text-slate-400">
            ©
            <Suspense fallback={<span>© 2026</span>}>
              <CopyrightYear />
            </Suspense>
            AIGuard Inc. All rights reserved.
          </p>
          <div className="flex items-center gap-6">
            <span className="flex items-center gap-1.5 text-xs text-slate-400">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" />
              Systems Operational
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
