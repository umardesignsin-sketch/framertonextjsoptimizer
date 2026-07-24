import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { ADMIN_COOKIE, isValidSession } from "@/lib/admin-auth";

// Gate /admin/* behind the owner password, and /dashboard/* + /editor/* behind
// a Supabase login. Also refreshes the Supabase session cookie on every match.
// Next 16 renamed the "middleware" convention to "proxy". Edge-safe: no Prisma.
export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // Owner admin panel — separate single-password gate (unchanged).
  if (pathname.startsWith("/admin")) {
    if (pathname.startsWith("/admin/login")) return NextResponse.next();
    const ok = await isValidSession(req.cookies.get(ADMIN_COOKIE)?.value);
    if (!ok) {
      const url = req.nextUrl.clone();
      url.pathname = "/admin/login";
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
    return NextResponse.next();
  }

  // Refresh the Supabase session cookies and read the current user.
  let res = NextResponse.next({ request: req });
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => req.cookies.set(name, value));
          res = NextResponse.next({ request: req });
          cookiesToSet.forEach(({ name, value, options }) => res.cookies.set(name, value, options));
        },
      },
    }
  );
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (
    (pathname.startsWith("/dashboard") || pathname.startsWith("/editor") || pathname.startsWith("/studio")) &&
    !user
  ) {
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // Forward the identity this getUser() call already verified so page code
  // (requireUser/getAuthUser) doesn't repeat the exact same network round
  // trip to Supabase's Auth API on every request. Strip any client-supplied
  // versions of these headers first — trusting them unverified would let a
  // client spoof identity.
  const forwardHeaders = new Headers(req.headers);
  forwardHeaders.delete("x-fno-user-id");
  forwardHeaders.delete("x-fno-user-email");
  if (user) {
    forwardHeaders.set("x-fno-user-id", user.id);
    if (user.email) forwardHeaders.set("x-fno-user-email", user.email);
  }
  const finalRes = NextResponse.next({ request: { headers: forwardHeaders } });
  res.cookies.getAll().forEach((c) => finalRes.cookies.set(c));
  return finalRes;
}

export const config = {
  matcher: ["/admin/:path*", "/dashboard/:path*", "/editor/:path*", "/studio/:path*"],
};
