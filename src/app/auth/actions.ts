"use server";

import { createServerSupabaseClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { headers } from "next/headers";

export async function signup(formData: FormData) {
  const supabase = await createServerSupabaseClient();
  const origin = (await headers()).get("origin"); // Get the base URL (e.g., http://localhost:3000)

  const fullName = formData.get("name") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName, // 👈 THIS is the key
      },
    },
  });

  if (error) {
    // Senior Tip: Always use encodeURIComponent for URL parameters to handle spaces/symbols.
    return redirect("/signup?error=" + encodeURIComponent(error.message));
  }

  return redirect("/dashboard");
}

export async function login(formData: FormData) {
  const supabase = await createServerSupabaseClient();
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return redirect("/login?error=" + encodeURIComponent(error.message));
  }

  // Revalidate the path or redirect to clear any stale cache
  return redirect("/dashboard");
}

export async function logout() {
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();
  return redirect("/login");
}
