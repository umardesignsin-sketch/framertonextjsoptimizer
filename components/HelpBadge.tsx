"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";

// Hidden on full-canvas app surfaces (their own fixed chrome would collide
// with a floating badge) and the separately-gated admin panel.
const HIDDEN_PREFIXES = ["/editor", "/studio", "/admin"];

type Status = "idle" | "sending" | "sent" | "error";

export function HelpBadge() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [errorText, setErrorText] = useState("");

  if (HIDDEN_PREFIXES.some((p) => pathname?.startsWith(p))) return null;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setErrorText("");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, message, page: pathname }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Couldn't send that — try again.");
      setStatus("sent");
    } catch (err) {
      setStatus("error");
      setErrorText(err instanceof Error ? err.message : "Couldn't send that — try again.");
    }
  }

  function reset() {
    setOpen(false);
    setStatus("idle");
    setEmail("");
    setMessage("");
    setErrorText("");
  }

  return (
    <div className="fixed bottom-5 right-5 z-40">
      {open && (
        <div className="absolute bottom-14 right-0 w-[min(340px,calc(100vw-2.5rem))] rounded-2xl border border-border bg-background p-5 shadow-2xl">
          <div className="flex items-start justify-between">
            <h2 className="text-[15px] font-semibold">Need help?</h2>
            <button
              onClick={reset}
              aria-label="Close"
              className="-mr-1 -mt-1 rounded-lg p-1 text-muted-foreground hover:bg-foreground/5 hover:text-foreground"
            >
              ✕
            </button>
          </div>

          {status === "sent" ? (
            <p className="mt-3 text-[13.5px] leading-relaxed text-muted-foreground">
              Sent — we&apos;ll get back to you at {email}.
            </p>
          ) : (
            <form onSubmit={submit} className="mt-3 space-y-2.5">
              <p className="text-[13px] leading-relaxed text-muted-foreground">
                Send us a message and we&apos;ll reply by email.
              </p>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@email.com"
                disabled={status === "sending"}
                className="h-9 w-full rounded-lg border border-border-strong bg-background px-3 text-[13.5px] outline-none focus:border-foreground"
              />
              <textarea
                required
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="What do you need help with?"
                rows={4}
                disabled={status === "sending"}
                className="w-full resize-none rounded-lg border border-border-strong bg-background px-3 py-2 text-[13.5px] outline-none focus:border-foreground"
              />
              {status === "error" && <p className="text-[12.5px] text-red-600">{errorText}</p>}
              <button
                type="submit"
                disabled={status === "sending"}
                className="h-9 w-full rounded-lg bg-foreground text-[13.5px] font-medium text-background hover:opacity-90 disabled:opacity-50"
              >
                {status === "sending" ? "Sending…" : "Send message"}
              </button>
            </form>
          )}
        </div>
      )}

      <button
        onClick={() => setOpen((v) => !v)}
        className="flex h-11 items-center gap-2 rounded-full bg-foreground px-4 text-[13px] font-medium text-background shadow-lg hover:opacity-90"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <circle cx="12" cy="12" r="9" />
          <path d="M9.5 9a2.5 2.5 0 0 1 5 0c0 1.5-2 1.8-2 3.5" />
          <path d="M12 17h.01" />
        </svg>
        {open ? "Close" : "Need help?"}
      </button>
    </div>
  );
}
