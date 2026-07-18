import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-5xl flex-col gap-4 px-5 py-8 text-[13px] text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-5 w-5 items-center justify-center rounded bg-foreground text-[11px] font-bold text-background">
            F
          </div>
          <span>Framer → Next.js Optimizer</span>
        </div>
        <nav className="flex flex-wrap gap-x-5 gap-y-2">
          <Link href="/" className="hover:text-foreground">Hybrid converter</Link>
          <Link href="/framer-to-html" className="hover:text-foreground">Framer to HTML Converter</Link>
          <Link href="/export-framer-site" className="hover:text-foreground">Export Framer site</Link>
          <Link href="/nextjs" className="hover:text-foreground">Pure Next.js</Link>
          <Link href="/templates" className="hover:text-foreground">Free Framer Templates</Link>
          <Link href="/speed" className="hover:text-foreground">PageSpeed checker</Link>
          <Link href="/pricing" className="hover:text-foreground">Pricing</Link>
          <Link href="/vs/nocodexport" className="hover:text-foreground">vs NoCodeXport</Link>
          <Link href="/vs/convertframer" className="hover:text-foreground">vs ConvertFramer</Link>
          <Link href="/guides/self-host-framer" className="hover:text-foreground">Self-host Framer</Link>
          <Link href="/guides/remove-made-in-framer-badge" className="hover:text-foreground">Remove Framer badge</Link>
          <Link href="/blog" className="hover:text-foreground">Blog</Link>
          <a href="/llms.txt" className="hover:text-foreground">llms.txt</a>
        </nav>
      </div>
    </footer>
  );
}
