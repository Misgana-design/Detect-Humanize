"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown, LogOut, Settings2 } from "lucide-react";
import LogoutButton from "./LogoutButton";

export function ProfileMenu({
  name,
  email,
  avatarUrl,
}: {
  name: string;
  email: string;
  avatarUrl?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const handleClick = (event: MouseEvent) => {
      if (ref.current && !ref.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((current) => !current)}
        className="flex items-center gap-2 rounded-full border border-slate-200 bg-white px-2 py-1 shadow-sm transition hover:border-slate-300 hover:cursor-pointer"
      >
        {avatarUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={avatarUrl}
            alt={name}
            className="h-8 w-8 rounded-full object-cover"
          />
        ) : (
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white">
            {name
              .split(" ")
              .map((part) => part[0])
              .join("")
              .slice(0, 2)}
          </div>
        )}
        <ChevronDown className="h-4 w-4 text-slate-500" />
      </button>

      {open && (
        <div className="absolute right-0 mt-3 w-72 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
          <div className="border-b border-slate-100 px-4 py-4">
            <p className="font-semibold text-slate-900">{name}</p>
            <p className="mt-1 text-sm text-slate-500">{email}</p>
          </div>

          <div className="p-2">
            <Link
              href="/account"
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-700 transition hover:bg-slate-50"
              onClick={() => setOpen(false)}
            >
              <Settings2 className="h-4 w-4" />
              Manage account
            </Link>

            <div className="mt-1 rounded-xl px-3 py-2.5 text-sm text-slate-700 transition hover:bg-slate-50">
              <div className="flex items-center gap-3">
                <LogOut className="h-4 w-4" />
                <LogoutButton className="text-sm text-slate-700 hover:text-red-600 hover:cursor-pointer" />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
