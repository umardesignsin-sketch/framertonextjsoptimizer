import Link from "next/link";

const COLUMNS: { heading: string; links: { label: string; href: string }[] }[] = [
  {
    heading: "Product",
    links: [
      { label: "Hybrid converter", href: "/" },
      { label: "Framer to HTML", href: "/framer-to-html" },
      { label: "Pure Next.js", href: "/nextjs" },
      { label: "Export Framer site", href: "/export-framer-site" },
      { label: "PageSpeed checker", href: "/speed" },
    ],
  },
  {
    heading: "Resources",
    links: [
      { label: "Free Framer templates", href: "/templates" },
      { label: "Self-host Framer", href: "/guides/self-host-framer" },
      { label: "Remove Framer badge", href: "/guides/remove-made-in-framer-badge" },
      { label: "Blog", href: "/blog" },
      { label: "Manifesto", href: "/manifesto" },
      { label: "Roadmap", href: "/roadmap" },
      { label: "llms.txt", href: "/llms.txt" },
    ],
  },
  {
    heading: "Compare",
    links: [
      { label: "vs NoCodeXport", href: "/vs/nocodexport" },
      { label: "vs ConvertFramer", href: "/vs/convertframer" },
      { label: "Pricing", href: "/pricing" },
    ],
  },
  {
    heading: "Tools",
    links: [
      { label: "All tools", href: "/tools" },
      { label: "Meta tags checker", href: "/tools/meta-tags-checker" },
      { label: "Robots.txt generator", href: "/tools/robots-txt-generator" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="mx-auto max-w-5xl px-5 pb-10 pt-16">
      <div className="relative overflow-hidden rounded-2xl bg-foreground px-8 py-14 text-center sm:px-14">
        <div
          className="pointer-events-none absolute inset-0 opacity-90"
          style={{
            background:
              "radial-gradient(circle at 30% 20%, var(--accent) 0%, transparent 55%), radial-gradient(circle at 75% 80%, var(--accent-hover) 0%, transparent 50%)",
          }}
        />
        <div className="relative">
          <h2 className="text-[26px] font-semibold tracking-tight text-background sm:text-[34px]">
            Ready to leave Framer&apos;s runtime behind?
          </h2>
          <p className="mx-auto mt-3 max-w-md text-[14.5px] leading-relaxed text-background/70">
            Paste your published Framer URL and get a faster, self-hosted site in about a minute — free.
          </p>
          <Link
            href="/#convert"
            className="mt-6 inline-flex h-11 items-center rounded-full bg-background px-6 text-[14px] font-medium text-foreground transition-opacity hover:opacity-90"
          >
            Convert your site →
          </Link>
        </div>
      </div>

      <div className="mt-12 flex flex-col gap-10 sm:flex-row sm:justify-between">
        <div className="max-w-xs">
          <div className="flex items-center gap-2.5">
            <div className="flex h-6 w-6 items-center justify-center rounded bg-accent text-[12px] font-bold text-accent-foreground">
              F
            </div>
            <span className="text-[14px] font-semibold tracking-tight">Framer → Next.js</span>
          </div>
          <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground">
            Convert published Framer sites into fast, self-hosted HTML or a real Next.js project.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-x-8 gap-y-8 sm:grid-cols-4">
          {COLUMNS.map((col) => (
            <div key={col.heading}>
              <div className="text-[12px] font-semibold uppercase tracking-wide text-muted-foreground">
                {col.heading}
              </div>
              <ul className="mt-3 space-y-2.5">
                {col.links.map((l) => (
                  <li key={l.href}>
                    <Link href={l.href} className="text-[13.5px] text-muted-foreground hover:text-foreground">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>

      <div className="mt-12 border-t border-border pt-6 text-[12.5px] text-muted-foreground">
        © {new Date().getFullYear()} Framer → Next.js Optimizer. Not affiliated with Framer.
      </div>
    </footer>
  );
}
