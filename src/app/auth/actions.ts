"use server";

import { redirect } from "next/navigation";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { z } from "zod";
import {
  createServerSupabaseClient,
  createServiceSupabaseClient,
} from "@/lib/supabase/server";

// ── Validation schemas ────────────────────────────────────────────────────────

const signupSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters.").max(80, "Name is too long."),
  email: z.string().email("Please enter a valid email address."),
  password: z
    .string()
    .min(8, "Password must be at least 8 characters.")
    .max(128, "Password is too long.")
    .regex(/[A-Za-z]/, "Password must contain at least one letter.")
    .regex(/[0-9]/, "Password must contain at least one number."),
});

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email address."),
  password: z.string().min(1, "Password is required."),
});

// ── Signup ────────────────────────────────────────────────────────────────────

export async function signup(formData: FormData) {
  // 1. Validate inputs before touching the database
  const raw = {
    name:     ((formData.get("name")     as string) || "").trim(),
    email:    ((formData.get("email")    as string) || "").trim().toLowerCase(),
    password:  (formData.get("password") as string) || "",
  };

  const parsed = signupSchema.safeParse(raw);
  if (!parsed.success) {
    const firstError = parsed.error.errors[0]?.message ?? "Invalid input.";
    return redirect("/auth/signup?error=" + encodeURIComponent(firstError));
  }

  const { name: fullName, email, password } = parsed.data;

  let redirectPath = "/dashboard";

  try {
    const serviceSupabase = createServiceSupabaseClient();

    // 2. Check for existing account (profile lookup)
    const { data: existingProfile, error: lookupError } = await serviceSupabase
      .from("profiles")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (lookupError) {
      redirectPath =
        "/auth/signup?error=" +
        encodeURIComponent("We could not verify this email. Please try again.");
    } else if (existingProfile?.id) {
      redirectPath =
        "/auth/signup?error=" +
        encodeURIComponent(
          "An account with this email already exists. Please log in instead.",
        ) +
        "&email=" +
        encodeURIComponent(email);
    } else {
      // 3. Create the auth user
      const supabase = await createServerSupabaseClient();
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { full_name: fullName } },
      });

      if (error) {
        const alreadyRegistered =
          error.message.toLowerCase().includes("already") ||
          error.message.toLowerCase().includes("registered");

        redirectPath = alreadyRegistered
          ? "/auth/signup?error=" +
            encodeURIComponent(
              "An account with this email already exists. Please log in instead.",
            ) +
            "&email=" +
            encodeURIComponent(email)
          : "/auth/signup?error=" + encodeURIComponent(error.message);
      } else if (data.user && data.user.identities?.length === 0) {
        redirectPath =
          "/auth/signup?error=" +
          encodeURIComponent(
            "An account with this email already exists. Please log in instead.",
          ) +
          "&email=" +
          encodeURIComponent(email);
      }
      // Profile creation is handled by the handle_new_user DB trigger (migration 010).
      // No manual upsert needed here — the trigger fires atomically on auth.users insert.
    }
  } catch (err) {
    // Re-throw Next.js redirect errors — they are not real errors
    if (isRedirectError(err)) throw err;
    console.error("[signup] Unexpected error:", err);
    redirectPath =
      "/auth/signup?error=" +
      encodeURIComponent("Something went wrong. Please try again.");
  }

  return redirect(redirectPath);
}

// ── Login ─────────────────────────────────────────────────────────────────────

export async function login(formData: FormData) {
  // 1. Validate inputs before touching the database
  const raw = {
    email:    ((formData.get("email")    as string) || "").trim().toLowerCase(),
    password:  (formData.get("password") as string) || "",
  };

  const parsed = loginSchema.safeParse(raw);
  if (!parsed.success) {
    const firstError = parsed.error.errors[0]?.message ?? "Invalid input.";
    return redirect("/auth/login?error=" + encodeURIComponent(firstError));
  }

  const { email, password } = parsed.data;

  let redirectPath = "/dashboard";

  try {
    const serviceSupabase = createServiceSupabaseClient();

    // 2. Check if a profile exists for this email.
    //    NOTE: This improves UX by giving a clear "no account" message, but it
    //    does introduce a user enumeration vector. For a consumer writing tool
    //    this tradeoff is acceptable. If you later handle sensitive data,
    //    remove this check and rely on Supabase's generic "Invalid credentials".
    const { data: existingProfile } = await serviceSupabase
      .from("profiles")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (!existingProfile?.id) {
      redirectPath =
        "/auth/login?error=" +
        encodeURIComponent(
          "No account found with this email. Please sign up first.",
        ) +
        "&email=" +
        encodeURIComponent(email);
    } else {
      // 3. Attempt sign-in
      const supabase = await createServerSupabaseClient();
      const { error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        redirectPath =
          "/auth/login?error=" + encodeURIComponent(error.message);
      }
      // On success, redirectPath stays "/dashboard"
    }
  } catch (err) {
    if (isRedirectError(err)) throw err;
    console.error("[login] Unexpected error:", err);
    redirectPath =
      "/auth/login?error=" +
      encodeURIComponent("Something went wrong. Please try again.");
  }

  return redirect(redirectPath);
}

// ── Logout ────────────────────────────────────────────────────────────────────

export async function logout() {
  try {
    const supabase = await createServerSupabaseClient();
    await supabase.auth.signOut();
  } catch (err) {
    if (isRedirectError(err)) throw err;
    console.error("[logout] Error signing out:", err);
  }
  return redirect("/auth/login");
}
