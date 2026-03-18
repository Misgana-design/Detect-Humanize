"use client";

import { logout } from "@/app/auth/actions";

export default function LogoutButton() {
  return (
    <button
      onClick={() => logout()}
      className="text-sm font-medium text-gray-600 hover:text-red-600 transition-colors"
    >
      Sign Out
    </button>
  );
}
