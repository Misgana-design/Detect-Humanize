"use server";

import { redirect } from "next/navigation";
import {
  createServerSupabaseClient,
  createServiceSupabaseClient,
} from "@/lib/supabase/server";

export async function signup(formData: FormData) {
  const supabase = await createServerSupabaseClient();
  const serviceSupabase = createServiceSupabaseClient();

  const fullName = ((formData.get("name") as string) || "").trim();
  const email = ((formData.get("email") as string) || "").trim().toLowerCase();
  const password = formData.get("password") as string;

  const { data: existingProfile, error: lookupError } = await serviceSupabase
    .from("profiles")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (lookupError) {
    return redirect(
      "/auth/signup?error=" +
        encodeURIComponent("We could not verify this email. Please try again."),
    );
  }

  if (existingProfile?.id) {
    return redirect(
      "/auth/signup?error=" +
        encodeURIComponent(
          "An account with this email already exists. Please log in instead.",
        ) +
        "&email=" +
        encodeURIComponent(email),
    );
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: fullName,
      },
    },
  });

  if (error) {
    const alreadyRegistered =
      error.message.toLowerCase().includes("already") ||
      error.message.toLowerCase().includes("registered");

    if (alreadyRegistered) {
      return redirect(
        "/auth/signup?error=" +
          encodeURIComponent(
            "An account with this email already exists. Please log in instead.",
          ) +
          "&email=" +
          encodeURIComponent(email),
      );
    }

    return redirect("/auth/signup?error=" + encodeURIComponent(error.message));
  }

  if (data.user && data.user.identities?.length === 0) {
    return redirect(
      "/auth/signup?error=" +
        encodeURIComponent(
          "An account with this email already exists. Please log in instead.",
        ) +
        "&email=" +
        encodeURIComponent(email),
    );
  }

  if (data.user) {
    await serviceSupabase.from("profiles").upsert(
      {
        id: data.user.id,
        email,
        full_name: fullName || email.split("@")[0],
      },
      { onConflict: "id" },
    );
  }

  return redirect("/dashboard");
}

export async function login(formData: FormData) {
  const supabase = await createServerSupabaseClient();
  const serviceSupabase = createServiceSupabaseClient();
  const email = ((formData.get("email") as string) || "").trim().toLowerCase();
  const password = formData.get("password") as string;

  // Check if an account exists for this email before attempting login.
  // This gives a clear "no account found" message instead of the generic
  // "Invalid login credentials" that Supabase returns for both wrong password
  // and non-existent email.
  const { data: existingProfile } = await serviceSupabase
    .from("profiles")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (!existingProfile?.id) {
    return redirect(
      "/auth/login?error=" +
        encodeURIComponent(
          "No account found with this email. Please sign up first.",
        ) +
        "&email=" +
        encodeURIComponent(email),
    );
  }

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
