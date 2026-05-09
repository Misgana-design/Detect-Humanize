import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// In Next.js 16, the function must be named 'proxy' or be the default export
export async function proxy(request: NextRequest) {
  let response = NextResponse.next({
    request: { headers: request.headers },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => request.cookies.getAll(),
        setAll: (cookiesToSet) => {
          // 1. Update request cookies for the current execution
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );

          // 2. Sync with the response so the browser gets the update
          response = NextResponse.next({ request });

          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // This validates the session and handles the 'Unauthorized' issue
  // by ensuring the session is refreshed before hitting your API.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isDashboard = request.nextUrl.pathname.startsWith("/dashboard");
  const isAccount   = request.nextUrl.pathname.startsWith("/account");
  const isProtected = isDashboard || isAccount;
  const isAuthPage  =
    request.nextUrl.pathname.startsWith("/auth/login") ||
    request.nextUrl.pathname.startsWith("/auth/signup");

  // If the user has a valid JWT but their profile row was deleted from the DB,
  // sign them out and redirect to login. This prevents "ghost sessions".
  if (user && isProtected) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile?.id) {
      // Profile is gone — invalidate the session and redirect to login
      await supabase.auth.signOut();
      const loginUrl = new URL("/auth/login", request.url);
      loginUrl.searchParams.set(
        "error",
        encodeURIComponent("Your account no longer exists. Please sign up again."),
      );
      return NextResponse.redirect(loginUrl);
    }
  }

  // Protection Logic
  if (!user && isProtected) {
    return NextResponse.redirect(new URL("/auth/login", request.url));
  }

  // UX: Don't show login/signup to logged-in users
  if (user && isAuthPage) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return response;
}

// CRITICAL: The matcher must include /api to solve your 'Unauthorized' error
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
