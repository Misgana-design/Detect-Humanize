import { NextResponse } from "next/server";
import {
  createServerSupabaseClient,
  createServiceSupabaseClient,
} from "@/lib/supabase/server";

const DEFAULT_AUTH_REDIRECT = "/dashboard";

function safeRelativePath(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) {
    return DEFAULT_AUTH_REDIRECT;
  }

  try {
    const parsed = new URL(value, "https://local.invalid");
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return DEFAULT_AUTH_REDIRECT;
  }
}

function authRedirect(pathname: string, request: Request, params?: Record<string, string>) {
  const redirectUrl = new URL(pathname, request.url);
  Object.entries(params ?? {}).forEach(([key, value]) => {
    redirectUrl.searchParams.set(key, value);
  });
  return NextResponse.redirect(redirectUrl);
}

function isFreshOAuthUser(createdAt?: string) {
  if (!createdAt) return false;
  const createdTime = new Date(createdAt).getTime();
  if (Number.isNaN(createdTime)) return false;
  return Date.now() - createdTime < 30 * 1000;
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const next = safeRelativePath(url.searchParams.get("next"));
  const intent = url.searchParams.get("intent") === "login" ? "login" : "signup";

  if (code) {
    const supabase = await createServerSupabaseClient();
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      return authRedirect("/auth/login", request, {
        error: "Could not complete Google sign-in. Please try again.",
      });
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      const serviceSupabase = createServiceSupabaseClient();

      if (intent === "login" && isFreshOAuthUser(user.created_at)) {
        await supabase.auth.signOut();
        await serviceSupabase.auth.admin.deleteUser(user.id);

        return authRedirect("/auth/signup", request, {
          email: user.email ?? "",
          error: "No account found with this Google email. Please sign up first.",
        });
      }

      await serviceSupabase.from("profiles").upsert(
        {
          id: user.id,
          email: user.email,
          full_name:
            user.user_metadata?.full_name ||
            user.user_metadata?.name ||
            user.email?.split("@")[0] ||
            "User",
          avatar_url:
            user.user_metadata?.avatar_url ||
            user.user_metadata?.picture ||
            null,
        },
        { onConflict: "id" },
      );
    }
  }

  return NextResponse.redirect(new URL(next, request.url));
}
