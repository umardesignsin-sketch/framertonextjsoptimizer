import type { Metadata } from "next";

// The /nextjs page is a client component and cannot export metadata itself,
// so this server-side segment layout supplies its self-referencing canonical
// (overriding the "/" canonical inherited from the root layout) and Open Graph URL.
export const metadata: Metadata = {
  title: "Convert to a pure Next.js project",
  description:
    "Paste a published Framer URL and get back a real, deployable Next.js App Router project — one statically-prerendered route per page that renders identically to the original.",
  alternates: {
    canonical: "/nextjs",
  },
  openGraph: {
    type: "website",
    url: "/nextjs",
    title: "Convert to a pure Next.js project",
    description:
      "Paste a published Framer URL and get back a real, deployable Next.js App Router project — one statically-prerendered route per page that renders identically to the original.",
  },
};

export default function NextjsLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
