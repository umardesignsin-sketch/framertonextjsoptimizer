// GET /auth/callback?code=...&next=...
// OAuth (Google) return URL. Exchanges the PKCE code for a Supabase session
// and sets the session cookies on the redirect response, then sends the user
// on to `next`. Cookie handling mirrors proxy.ts so the session sticks.
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { captureSignup, ATTR_COOKIE } from "@/lib/attribution";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const errorDescription = searchParams.get("error_description");

  // Only allow same-origin relative destinations.
  const rawNext = searchParams.get("next") || "/dashboard";
  const next = rawNext.startsWith("/") && !rawNext.startsWith("//") ? rawNext : "/dashboard";

  if (errorDescription) {
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(errorDescription)}`);
  }
  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent("Sign-in was cancelled")}`);
  }

  const response = NextResponse.redirect(`${origin}${next}`);
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    }
  );

  const { data, error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error.message)}`);
  }

  // First-touch signup attribution (idempotent — only the first sign-in
  // creates a row). Country from the CDN geo header; source from the
  // first-touch cookie set on landing.
  const userId = data.user?.id;
  if (userId) {
    const country =
      request.headers.get("x-vercel-ip-country") ||
      request.headers.get("cf-ipcountry") ||
      null;
    await captureSignup(userId, {
      cookie: request.cookies.get(ATTR_COOKIE)?.value,
      country,
    });
  }
  return response;
}
