import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
// Ensure you have generated your types with: npx supabase gen types typescript --project-id your-id
import type { Database } from "@/types/supabase";

export async function createServerSupabaseClient() {
  // In Next.js 15+, cookies() is an async function
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, // Standard naming is 'ANON_KEY'
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // The 'setAll' can fail if called from a Server Component (which is read-only).
            // This is expected behavior in Next.js App Router.
            // Middleware or Server Actions are where the actual 'setting' happens.
          }
        },
      },
    },
  );
}
