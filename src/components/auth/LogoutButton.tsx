"use client";

import { logout } from "@/app/auth/actions";

export default function LogoutButton({
  className = "text-sm font-medium text-gray-600 transition-colors hover:text-red-600 hover:cursor-pointer",
}: {
  className?: string;
}) {
  return (
    <button
      onClick={() => logout()}
      className={className}
    >
      Sign Out
    </button>
  );
}
