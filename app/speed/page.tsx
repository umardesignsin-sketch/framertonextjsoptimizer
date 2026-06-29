import { SpeedCompare } from "@/components/SpeedCompare";

export const metadata = {
  title: "PageSpeed checker — Framer vs converted",
};

export default function SpeedPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-12">
      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">PageSpeed checker</h1>
      <p className="mt-2 text-[15px] leading-relaxed text-muted-foreground">
        Compare a Framer site against its converted/deployed version. Real Google
        Lighthouse scores — Performance, SEO, Accessibility and Best Practices — measured
        on both <span className="font-medium text-foreground">desktop</span> and{" "}
        <span className="font-medium text-foreground">mobile</span>.
      </p>
      <div className="mt-6">
        <SpeedCompare />
      </div>
    </div>
  );
}
