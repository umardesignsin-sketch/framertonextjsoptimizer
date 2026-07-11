"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/** URL input on SEO landing pages that funnels into the real converter
 *  (the home page prefills from ?url= and the user confirms Convert). */
export function UrlFunnelForm({ cta = "Convert to HTML" }: { cta?: string }) {
  const router = useRouter();
  const [url, setUrl] = useState("");

  function go() {
    const u = url.trim();
    if (!u) return;
    router.push(`/?url=${encodeURIComponent(u)}`);
  }

  return (
    <div className="flex flex-col gap-2 sm:flex-row">
      <input
        type="url"
        value={url}
        onChange={(e) => setUrl(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && go()}
        placeholder="https://your-site.framer.website"
        spellCheck={false}
        className="h-11 flex-1 rounded-lg border border-border-strong bg-background px-3.5 text-[15px] outline-none placeholder:text-muted-foreground focus:border-foreground"
      />
      <button
        onClick={go}
        disabled={!url.trim()}
        className="h-11 rounded-lg bg-foreground px-5 text-[15px] font-medium text-background transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {cta}
      </button>
    </div>
  );
}
