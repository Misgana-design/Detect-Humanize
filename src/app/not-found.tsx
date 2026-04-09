// app/not-found.tsx
import Link from "next/link";

// Making this static (no async, no connection) fixes the error immediately
export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h2 className="text-2xl font-bold font-geist">404 - Not Found</h2>
      <Link href="/" className="mt-4 text-blue-500 underline">
        Return Home
      </Link>
    </div>
  );
}
