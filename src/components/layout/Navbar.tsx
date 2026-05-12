"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ProfileMenu } from "@/components/auth/ProfileMenu";
import { createClient } from "@/lib/supabase/client";
import { Brand } from "./Brand";

const navLinks = [
  { name: "AI Detector", href: "/detector"  },
  { name: "Humanizer",   href: "/humanize"  },
  { name: "Detectors",   href: "/detectors" },
  { name: "Pricing",     href: "/pricing"   },
  { name: "FAQ",         href: "/faq"       },
];

export default function Navbar() {
  const pathname = usePathname();
  const supabase = createClient();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [user, setUser] = useState<{
    name: string;
    email: string;
    avatarUrl: string | null;
  } | null>(null);

  const menuRef = useRef<HTMLDivElement>(null);

  // Scroll shadow
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Close mobile menu on route change
  useEffect(() => { setMobileOpen(false); }, [pathname]);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMobileOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Prevent body scroll when menu is open
  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileOpen]);

  // Fetch auth state
  useEffect(() => {
    const load = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) { setUser(null); return; }

      const { data: profile } = await supabase
        .from("profiles")
        .select("full_name, email, avatar_url")
        .eq("id", authUser.id)
        .maybeSingle();

      setUser({
        name:
          profile?.full_name ||
          authUser.user_metadata?.full_name ||
          authUser.email?.split("@")[0] ||
          "User",
        email: profile?.email || authUser.email || "",
        avatarUrl:
          authUser.user_metadata?.avatar_url ||
          authUser.user_metadata?.picture ||
          profile?.avatar_url ||
          null,
      });
    };

    void load();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => { void load(); });
    return () => subscription.unsubscribe();
  }, [supabase]);

  return (
    <>
      <nav
        className={`sticky top-0 z-50 w-full bg-white/90 backdrop-blur-xl transition-shadow duration-200 ${
          scrolled
            ? "shadow-sm shadow-slate-900/5"
            : "border-b border-slate-100"
        }`}
      >
        <div className="mx-auto flex h-15 max-w-7xl items-center justify-between px-5 lg:px-8">
          {/* Brand */}
          <Brand size="md" />

          {/* Desktop nav — centered */}
          <div className="hidden items-center gap-1 md:flex">
            {navLinks.map((link) => {
              const isActive =
                pathname === link.href || pathname.startsWith(link.href + "/");
              return (
                <Link
                  key={link.name}
                  href={link.href}
                  className={`relative rounded-lg px-3.5 py-2 text-sm font-medium transition-colors duration-150 ${
                    isActive
                      ? "text-indigo-600"
                      : "text-slate-600 hover:text-slate-900 hover:bg-slate-50"
                  }`}
                >
                  {link.name}
                  {isActive && (
                    <span className="absolute bottom-0 left-1/2 h-0.5 w-4 -translate-x-1/2 rounded-full bg-indigo-600" />
                  )}
                </Link>
              );
            })}
          </div>

          {/* Desktop auth */}
          <div className="hidden items-center gap-2.5 md:flex">
            {user ? (
              <>
                <Link href="/dashboard">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-slate-600 hover:text-slate-900"
                  >
                    Dashboard
                  </Button>
                </Link>
                <ProfileMenu
                  name={user.name}
                  email={user.email}
                  avatarUrl={user.avatarUrl}
                />
              </>
            ) : (
              <>
                <Link href="/auth/login">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-slate-600 hover:text-slate-900"
                  >
                    Log in
                  </Button>
                </Link>
                <Link href="/auth/signup">
                  <Button
                    size="sm"
                    className="rounded-xl bg-indigo-600 px-4 text-white shadow-sm shadow-indigo-200 hover:bg-indigo-700"
                  >
                    Get Started
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            className="flex h-9 w-9 items-center justify-center rounded-lg text-slate-600 transition hover:bg-slate-100 md:hidden"
            onClick={() => setMobileOpen((o) => !o)}
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
        </div>
      </nav>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-40 md:hidden" aria-modal="true">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />

          {/* Panel — slides in from right */}
          <div
            ref={menuRef}
            className="absolute right-0 top-0 flex h-full w-70 flex-col bg-white shadow-2xl"
          >
            {/* Header */}
            <div className="flex h-15 items-center justify-between border-b border-slate-100 px-5">
              <Brand size="sm" onClick={() => setMobileOpen(false)} />
              <button
                onClick={() => setMobileOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                aria-label="Close menu"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            {/* Nav links */}
            <nav className="flex-1 overflow-y-auto px-3 py-4">
              <ul className="space-y-0.5">
                {navLinks.map((link) => {
                  const isActive = pathname === link.href;
                  return (
                    <li key={link.name}>
                      <Link
                        href={link.href}
                        onClick={() => setMobileOpen(false)}
                        className={`flex items-center rounded-xl px-4 py-2.5 text-sm font-medium transition-colors ${
                          isActive
                            ? "bg-indigo-50 text-indigo-600"
                            : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                        }`}
                      >
                        {link.name}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>

            {/* Auth section */}
            <div className="border-t border-slate-100 px-4 py-4">
              {user ? (
                <div className="space-y-2">
                  <div className="flex items-center gap-3 rounded-xl bg-slate-50 px-3 py-2.5">
                    {user.avatarUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={user.avatarUrl}
                        alt={user.name}
                        className="h-8 w-8 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">
                        {user.name
                          .split(" ")
                          .map((p) => p[0])
                          .join("")
                          .slice(0, 2)}
                      </div>
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-slate-900">
                        {user.name}
                      </p>
                      <p className="truncate text-xs text-slate-500">
                        {user.email}
                      </p>
                    </div>
                  </div>
                  <Link
                    href="/dashboard"
                    onClick={() => setMobileOpen(false)}
                    className="block w-full rounded-xl bg-slate-900 px-4 py-2.5 text-center text-sm font-semibold text-white transition hover:bg-slate-800"
                  >
                    Dashboard
                  </Link>
                  <Link
                    href="/account"
                    onClick={() => setMobileOpen(false)}
                    className="block w-full rounded-xl border border-slate-200 px-4 py-2.5 text-center text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                  >
                    Manage Account
                  </Link>
                </div>
              ) : (
                <div className="space-y-2">
                  <Link
                    href="/auth/login"
                    onClick={() => setMobileOpen(false)}
                    className="block w-full rounded-xl border border-slate-200 px-4 py-2.5 text-center text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                  >
                    Log in
                  </Link>
                  <Link
                    href="/auth/signup"
                    onClick={() => setMobileOpen(false)}
                    className="block w-full rounded-xl bg-indigo-600 px-4 py-2.5 text-center text-sm font-semibold text-white transition hover:bg-indigo-700 hover:cursor-pointer"
                  >
                    Get Started
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
