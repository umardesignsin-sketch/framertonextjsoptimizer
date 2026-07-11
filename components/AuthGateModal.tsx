"use client";

import { GoogleAuthButton } from "@/components/GoogleAuthButton";

/**
 * Blocking modal shown when a signed-out visitor tries to convert a site.
 * `next` is the path to return to after auth (preserves the pasted URL via
 * the caller re-reading its own state — Google OAuth round-trips through
 * /auth/callback, email/password go through the full /login /signup pages).
 */
export function AuthGateModal({ next, onClose }: { next: string; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-2xl border border-border bg-background p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold">Log in to convert</h2>
            <p className="mt-1 text-[13.5px] leading-relaxed text-muted-foreground">
              Create a free account to convert this site — it takes a few seconds and lets you
              re-download, deploy, and edit your sites from a dashboard.
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="-mr-1 -mt-1 rounded-lg p-1.5 text-muted-foreground hover:bg-foreground/5 hover:text-foreground"
          >
            ✕
          </button>
        </div>

        <div className="mt-5">
          <GoogleAuthButton next={next} label="Continue with Google" />
        </div>

        <div className="my-4 flex items-center gap-3 text-[12px] text-muted-foreground">
          <span className="h-px flex-1 bg-border" />
          or
          <span className="h-px flex-1 bg-border" />
        </div>

        <div className="flex gap-2">
          <a
            href={`/signup?next=${encodeURIComponent(next)}`}
            className="h-11 flex-1 rounded-lg bg-foreground text-center text-[14px] font-medium leading-[44px] text-background hover:opacity-90"
          >
            Sign up
          </a>
          <a
            href={`/login?next=${encodeURIComponent(next)}`}
            className="h-11 flex-1 rounded-lg border border-border-strong text-center text-[14px] font-medium leading-[44px] hover:border-foreground"
          >
            Log in
          </a>
        </div>
      </div>
    </div>
  );
}
