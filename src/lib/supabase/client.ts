import { createBrowserClient } from "@supabase/ssr";

/**
 * Singleton client for use in Client Components.
 * Uses the browser's fetch and manages session via cookies automatically.
 */
export const createClient = () =>
  createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
