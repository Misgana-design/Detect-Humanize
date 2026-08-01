"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { BookOpenText, LayoutDashboard, Menu, Sparkles, Tags, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ProfileMenu } from "@/components/auth/ProfileMenu";
import { createClient } from "@/lib/supabase/client";
import { Brand } from "./Brand";

const navLinks = [
  { name: "Humanizer", href: "/", icon: Sparkles, scrollTo: "humanizer" },
  { name: "Pricing",   href: "/pricing", icon: Tags },
  { name: "Blog",      href: "/blog",    icon: BookOpenText },
];

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = createClient();

  // Scroll to a section id, navigating to the homepage first if needed
  const handleScrollTo = (sectionId: string) => {
    const tryScroll = () => {
      const el = document.getElementById(sectionId);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    };

    if (pathname !== "/") {
      router.push("/");
      // Wait for the page to render before scrolling
      setTimeout(tryScroll, 400);
    } else {
      tryScroll();
    }
  };

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

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
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
            ? "border-b border-slate-200 shadow-sm shadow-slate-900/5"
            : "border-b border-slate-100"
        }`}
      >
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-5 lg:px-8">
          {/* Brand */}
          <Brand size="lg" />

          {/* Desktop nav — centered */}
          <div className="hidden items-center rounded-2xl border border-slate-200 bg-slate-50/80 p-1 lg:flex">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = link.scrollTo
                ? pathname === "/"
                : pathname === link.href || pathname.startsWith(link.href + "/");

              if (link.scrollTo) {
                return (
                  <button
                    key={link.name}
                    onClick={() => handleScrollTo(link.scrollTo!)}
                    className={`relative inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold transition-colors duration-150 hover:cursor-pointer ${
                      isActive
                        ? "bg-white text-indigo-600 shadow-sm"
                        : "text-slate-600 hover:bg-white hover:text-slate-900"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    {link.name}
                  </button>
                );
              }

              return (
                <Link
                  key={link.name}
                  href={link.href}
                  aria-current={isActive ? "page" : undefined}
                  className={`relative inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-sm font-semibold transition-colors duration-150 ${
                    isActive
                      ? "bg-white text-indigo-600 shadow-sm"
                      : "text-slate-600 hover:bg-white hover:text-slate-900"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {link.name}
                </Link>
              );
            })}
          </div>

          {/* Desktop auth */}
          <div className="hidden items-center gap-2.5 lg:flex">
            {user ? (
              <>
                <Link href="/dashboard">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-2 text-slate-600 hover:text-slate-900"
                  >
                    <LayoutDashboard className="h-4 w-4" />
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
                    className="rounded-xl bg-indigo-600 px-4 text-white shadow-sm shadow-indigo-200 hover:bg-indigo-700 hover:cursor-pointer"
                  >
                    Get Started
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 lg:hidden"
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
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation menu">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-slate-900/30 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />

          {/* Panel — slides in from right */}
          <div
            ref={menuRef}
            className="absolute right-0 top-0 flex h-full w-[min(22rem,calc(100vw-1.5rem))] flex-col bg-white shadow-2xl"
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
                  const Icon = link.icon;
                  const isActive = link.scrollTo
                    ? pathname === "/"
                    : pathname === link.href || pathname.startsWith(link.href + "/");

                  if (link.scrollTo) {
                    return (
                      <li key={link.name}>
                        <button
                          onClick={() => {
                            setMobileOpen(false);
                            handleScrollTo(link.scrollTo!);
                          }}
                          className={`flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-colors hover:cursor-pointer ${
                            isActive
                              ? "bg-indigo-50 text-indigo-600"
                              : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                          {link.name}
                        </button>
                      </li>
                    );
                  }

                  return (
                    <li key={link.name}>
                      <Link
                        href={link.href}
                        onClick={() => setMobileOpen(false)}
                        aria-current={isActive ? "page" : undefined}
                        className={`flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-semibold transition-colors ${
                          isActive
                            ? "bg-indigo-50 text-indigo-600"
                            : "text-slate-700 hover:bg-slate-50 hover:text-slate-900"
                        }`}
                      >
                        <Icon className="h-4 w-4" />
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
