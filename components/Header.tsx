import Link from "next/link";
import { AuthNavLink } from "@/components/AuthNavLink";

// Figma: Homepage → Hero section → Nav bar (node 5:239). 1360px frame, 80px
// side gutters, 56px tall, sitting 24px below the top of the page (the header
// owns that 24px so the hero only pads the remaining 72px above its content).
//
// The links are centred on the *frame*, not in the space left over between the
// logo and the CTA — so they're absolutely positioned at 50% rather than laid
// out in a three-column grid, which would drift as either edge changes width.
export function Header() {
  return (
    <header className="pt-6">
      <div className="relative mx-auto flex h-14 max-w-[1360px] items-center justify-between px-5 lg:px-20">
        <Link href="/" className="flex items-center gap-1" aria-label="FNJ home">
          <span className="relative block size-12 shrink-0 overflow-hidden bg-white">
            {/* Exported brand mark — the glyph is inset inside its 48px box. */}
            <span className="absolute inset-[19.58%_17.22%_18.65%_16.29%] block">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src="/fnj-mark.svg"
                alt=""
                className="absolute inset-0 block size-full max-w-none"
              />
            </span>
          </span>
          <span className="text-[28px] font-semibold leading-none text-black">FNJ</span>
        </Link>

        <nav
          className="absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2 items-center gap-8 text-[16px] leading-none text-[#1a1a1a] md:flex"
          aria-label="Main navigation"
        >
          <Link href="/#how-it-works" className="transition-opacity hover:opacity-60">
            How it works
          </Link>
          <Link href="/#faq" className="transition-opacity hover:opacity-60">
            FAQs
          </Link>
          <Link href="/blog" className="transition-opacity hover:opacity-60">
            Blog
          </Link>
        </nav>

        <div className="flex items-center gap-6">
          <AuthNavLink />
          {/* Inset shadow, not a border: Figma strokes sit inside the frame,
              so a real border would make this 186 × 50 instead of 184 × 48. */}
          <Link
            href="/#convert"
            className="hidden items-center justify-center rounded-[80px] bg-white px-6 py-4 text-[16px] font-medium leading-none text-[#292929] shadow-[inset_0_0_0_1px_rgba(174,174,178,0.5)] transition-colors hover:bg-[#f7f6f5] sm:inline-flex"
          >
            Convert to Next.js
          </Link>
        </div>
      </div>
    </header>
  );
}
