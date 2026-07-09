import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const siteUrl = "https://framertonextjs.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Framer → Next.js Optimizer",
    template: "%s — Framer → Next.js Optimizer",
  },
  description:
    "Paste a published Framer URL and get back a heavily-optimized static site built for maximum Lighthouse scores.",
  applicationName: "Framer → Next.js Optimizer",
  // Home self-canonicalizes to the production domain. Every other public route
  // sets its own canonical (via a segment layout or page metadata), so nothing
  // inherits the old Framer preview domain.
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    url: "/",
    siteName: "Framer → Next.js Optimizer",
    title: "Framer → Next.js Optimizer",
    description:
      "Paste a published Framer URL and get back a heavily-optimized static site built for maximum Lighthouse scores.",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Framer → Next.js Optimizer",
    description:
      "Paste a published Framer URL and get back a heavily-optimized static site built for maximum Lighthouse scores.",
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
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
