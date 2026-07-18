import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/next";
import Script from "next/script";
import "./globals.css";
import { SITE, KEYWORDS, siteJsonLd, jsonLdScript } from "@/lib/site-meta";

const GA_MEASUREMENT_ID = "G-RQ8X7MFJP6";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: "Framer to Next.js Converter | Export Framer Sites",
    template: "%s — Framer → Next.js Optimizer",
  },
  description:
    "Convert any Framer website into production-ready Next.js or clean static HTML — strip Framer lock-in, boost Lighthouse & SEO, host anywhere. Free.",
  applicationName: SITE.name,
  keywords: KEYWORDS,
  authors: [{ name: SITE.name, url: SITE.url }],
  creator: SITE.name,
  publisher: SITE.name,
  category: "technology",
  // Home self-canonicalizes to the production domain. Every other public route
  // sets its own canonical (via a segment layout or page metadata), so nothing
  // inherits the old Framer preview domain.
  alternates: {
    canonical: "/",
  },
  // Site ownership verification (Bing Webmaster Tools).
  verification: {
    other: {
      "msvalidate.01": "220C73AACB616F7640521CA6542E49AF",
    },
  },
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml" }],
    shortcut: "/icon.svg",
    apple: "/icon.svg",
  },
  // Let search + answer engines use full snippets and large image previews.
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  openGraph: {
    type: "website",
    url: "/",
    siteName: SITE.name,
    title: "Framer to Next.js Converter | Export Framer Sites",
    description:
      "Convert any Framer website into production-ready Next.js or clean static HTML — strip Framer lock-in, boost Lighthouse & SEO, host anywhere. Free.",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Framer to Next.js Converter | Export Framer Sites",
    description:
      "Convert any Framer website into production-ready Next.js or clean static HTML — strip Framer lock-in, boost Lighthouse & SEO, host anywhere. Free.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        {/* Sitewide structured data: Organization + WebSite + SoftwareApplication */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: jsonLdScript(siteJsonLd()) }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        {children}
        <Analytics />
        {/* Google tag (gtag.js) */}
        <Script
          src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
          strategy="afterInteractive"
        />
        <Script id="ga-init" strategy="afterInteractive">
          {`
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${GA_MEASUREMENT_ID}');
          `}
        </Script>
      </body>
    </html>
  );
}
