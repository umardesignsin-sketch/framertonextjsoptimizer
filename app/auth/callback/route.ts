// GET /auth/callback?code=...&next=...
// OAuth (Google) return URL. Exchanges the PKCE code for a Supabase session
// and sets the session cookies on the redirect response, then sends the user
// on to `next`. Cookie handling mirrors proxy.ts so the session sticks.
import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { captureSignup, ATTR_COOKIE } from "@/lib/attribution";
import { SITE } from "@/lib/site-meta";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Deliberately NOT `new URL(request.url).origin` — behind Railway's proxy,
// Next.js resolved that to the container's internal http://localhost:8080
// instead of the public domain, sending real users through a Google
// sign-in only to land on an address only reachable from inside the
// container. SITE.url is fixed and proxy-independent, so this can't happen
// no matter how a future host proxies the request.
const origin = SITE.url;

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
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

  // Everything below can throw (network hiccup talking to Supabase, a bad
  // cookie, etc.) — and by the time we're here, Google's side of the OAuth
  // handshake has already succeeded, so an unhandled exception would show
  // the visitor Next.js's raw error page while their account was actually
  // created. Route every failure through the same graceful /login?error=
  // redirect instead of letting this crash.
  try {
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
      console.error("[auth/callback] exchangeCodeForSession failed:", error.message);
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
        userAgent: request.headers.get("user-agent"),
      });
    }
    return response;
  } catch (err) {
    // The account may well exist at this point (Google's side succeeded) —
    // send them to login, where an existing session or a re-attempt both
    // work, instead of a dead-end error page.
    console.error("[auth/callback] unexpected error:", err);
    return NextResponse.redirect(
      `${origin}/login?error=${encodeURIComponent("Something went wrong finishing sign-in — please try logging in again.")}`
    );
  }
}
