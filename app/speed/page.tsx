import Link from "next/link";
import { SpeedCompare } from "@/components/SpeedCompare";

export const metadata = {
  title: { absolute: "Framer PageSpeed Checker | Compare Lighthouse Scores" },
  description:
    "Compare real Lighthouse / PageSpeed scores: original Framer site vs converted HTML or Next.js — desktop and mobile side by side.",
  // Self-canonicalize to the query-less path so the ?original/?converted variants
  // don't fragment indexing.
  alternates: {
    canonical: "/speed",
  },
  openGraph: {
    type: "website",
    url: "/speed",
    title: "Framer PageSpeed Checker | Compare Lighthouse Scores",
    description:
      "Compare real Lighthouse / PageSpeed scores: original Framer site vs converted HTML or Next.js — desktop and mobile side by side.",
  },
  twitter: {
    card: "summary_large_image",
    title: "Framer PageSpeed Checker | Compare Lighthouse Scores",
    description:
      "Compare real Lighthouse / PageSpeed scores: original Framer site vs converted HTML or Next.js — desktop and mobile side by side.",
  },
};

export default async function SpeedPage({
  searchParams,
}: {
  searchParams: Promise<{ original?: string; converted?: string }>;
}) {
  const sp = await searchParams;
  return (
    <main className="mx-auto max-w-3xl px-5 py-12">
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
        Framer vs Converted — PageSpeed Comparison
      </h1>
      <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">
        Compare a Framer site against its{" "}
        <Link href="/nextjs" className="text-foreground underline underline-offset-2">converted version</Link>{" "}
        with real Google{" "}
        <a href="https://developer.chrome.com/docs/lighthouse/overview" target="_blank" rel="noopener noreferrer" className="text-foreground underline underline-offset-2">Lighthouse</a>{" "}
        scores — Performance, SEO, Accessibility and Best Practices — measured on both{" "}
        <span className="font-medium text-foreground">desktop</span> and{" "}
        <span className="font-medium text-foreground">mobile</span>, the same engine behind{" "}
        <a href="https://pagespeed.web.dev" target="_blank" rel="noopener noreferrer" className="text-foreground underline underline-offset-2">PageSpeed Insights</a>{" "}
        and{" "}
        <a href="https://web.dev/articles/vitals" target="_blank" rel="noopener noreferrer" className="text-foreground underline underline-offset-2">Core Web Vitals</a>.
      </p>
      <p className="mt-3 text-[15px] leading-relaxed text-muted-foreground">
        To create an optimized version to test, run your site through the{" "}
        <Link href="/" className="text-foreground underline underline-offset-2">Hybrid converter</Link>{" "}
        for the highest scores, or the{" "}
        <Link href="/nextjs" className="text-foreground underline underline-offset-2">Pure Next.js export</Link>{" "}
        for real, deployable code — then paste both URLs below.
      </p>
      <div className="mt-6">
        <SpeedCompare
          initialOriginal={sp.original ?? ""}
          initialConverted={sp.converted ?? ""}
        />
      </div>
    </main>
  );
}
