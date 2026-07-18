import Link from "next/link";
import { AuthNavLink } from "@/components/AuthNavLink";

export function Header() {
  return (
    <header className="sticky top-0 z-20 border-b border-border bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-3">
        <Link href="/" className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent text-[13px] font-bold text-accent-foreground">
            F
          </div>
          <span className="text-[15px] font-semibold tracking-tight">
            Framer <span className="text-muted-foreground">→</span> Next.js
          </span>
        </Link>
        <nav className="hidden items-center gap-1 rounded-full border border-border bg-muted/60 p-1 text-[13px] font-medium md:flex">
          <Link href="/framer-to-html" className="rounded-full px-3.5 py-1.5 text-muted-foreground transition-colors hover:bg-background hover:text-foreground">
            HTML
          </Link>
          <Link href="/nextjs" className="rounded-full px-3.5 py-1.5 text-muted-foreground transition-colors hover:bg-background hover:text-foreground">
            Next.js
          </Link>
          <Link href="/templates" className="rounded-full px-3.5 py-1.5 text-muted-foreground transition-colors hover:bg-background hover:text-foreground">
            Templates
          </Link>
          <Link href="/speed" className="rounded-full px-3.5 py-1.5 text-muted-foreground transition-colors hover:bg-background hover:text-foreground">
            PageSpeed
          </Link>
          <Link href="/blog" className="rounded-full px-3.5 py-1.5 text-muted-foreground transition-colors hover:bg-background hover:text-foreground">
            Blog
          </Link>
        </nav>
        <div className="flex items-center gap-3 text-[13px]">
          <AuthNavLink />
          <Link
            href="/#convert"
            className="hidden h-9 items-center rounded-full bg-accent px-4 font-medium text-accent-foreground transition-colors hover:bg-accent-hover sm:inline-flex"
          >
            Convert free →
          </Link>
        </div>
      </div>
    </header>
  );
}
