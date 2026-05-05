"use server";

import { redirect } from "next/navigation";
import { createServerSupabaseClient } from "@/lib/supabase/server";

export async function signup(formData: FormData) {
  const supabase = await createServerSupabaseClient();

  const fullName = formData.get("name") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
    },
  });

  if (error) {
    return redirect("/auth/signup?error=" + encodeURIComponent(error.message));
  }

  return redirect("/dashboard");
}

export async function login(formData: FormData) {
  const supabase = await createServerSupabaseClient();
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return redirect("/auth/login?error=" + encodeURIComponent(error.message));
  }

  return redirect("/dashboard");
}

export async function logout() {
  const supabase = await createServerSupabaseClient();
  await supabase.auth.signOut();
  return redirect("/auth/login");
}
