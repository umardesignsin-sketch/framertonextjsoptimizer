import type { Metadata } from "next";

// The /nextjs page is a client component and cannot export metadata itself,
// so this server-side segment layout supplies its self-referencing canonical
// (overriding the "/" canonical inherited from the root layout) and Open Graph URL.
export const metadata: Metadata = {
  title: { absolute: "Convert Framer to Next.js | Production-Ready Export" },
  description:
    "Convert Framer to Next.js in one click: a real, deployable App Router project — one prerendered route per page, pixel-identical to your Framer site. Free.",
  alternates: {
    canonical: "/nextjs",
  },
  openGraph: {
    type: "website",
    url: "/nextjs",
    title: "Convert Framer to Next.js | Production-Ready Export",
    description:
      "Convert Framer to Next.js in one click: a real, deployable App Router project — one prerendered route per page, pixel-identical to your Framer site. Free.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Convert Framer to Next.js | Production-Ready Export",
    description:
      "Convert Framer to Next.js in one click: a real, deployable App Router project — one prerendered route per page, pixel-identical to your Framer site. Free.",
  },
};

export default function NextjsLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return children;
}
