"use client";

// Google Analytics 4 for the App Router. Two jobs the default gtag snippet
// gets wrong on an SPA:
//  1. First-touch attribution — on the very first visit, stash referrer +
//     UTM params + landing path in a 1-year cookie (never overwritten), so
//     the signup handler can attribute the account to where it came from.
//  2. Client-route pageviews — App Router soft navigations don't reload the
//     page, so gtag('config') only ever fires once. Emit an explicit
//     page_view on every route change instead.
import Script from "next/script";
import { useEffect } from "react";
import { usePathname, useSearchParams } from "next/navigation";

const COOKIE = "fno_attr";

function setFirstTouchCookie() {
  if (document.cookie.includes(`${COOKIE}=`)) return; // first touch only
  const q = new URLSearchParams(window.location.search);
  const data = {
    referrer: document.referrer || "",
    source: q.get("utm_source") || q.get("ref") || "",
    medium: q.get("utm_medium") || "",
    campaign: q.get("utm_campaign") || "",
    landingPath: window.location.pathname,
  };
  const value = encodeURIComponent(JSON.stringify(data));
  document.cookie = `${COOKIE}=${value}; path=/; max-age=31536000; samesite=lax`;
}

export function Analytics({ gaId }: { gaId: string }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    setFirstTouchCookie();
  }, []);

  // Fire a page_view on each client-side navigation.
  useEffect(() => {
    if (!gaId) return;
    const w = window as unknown as { gtag?: (...a: unknown[]) => void };
    if (typeof w.gtag !== "function") return;
    const qs = searchParams?.toString();
    w.gtag("event", "page_view", {
      page_path: pathname + (qs ? `?${qs}` : ""),
      page_location: window.location.href,
      page_title: document.title,
    });
  }, [pathname, searchParams, gaId]);

  if (!gaId) return null;
  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${gaId}`} strategy="afterInteractive" />
      <Script id="ga-init" strategy="afterInteractive">
        {`
          window.dataLayer = window.dataLayer || [];
          function gtag(){dataLayer.push(arguments);}
          gtag('js', new Date());
          gtag('config', '${gaId}', { send_page_view: true });
        `}
      </Script>
    </>
  );
}
