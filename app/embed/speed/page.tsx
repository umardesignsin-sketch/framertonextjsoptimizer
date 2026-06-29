"use client";

import { useState } from "react";
import { SpeedCompare } from "@/components/SpeedCompare";

export default function SpeedEmbed() {
  // Prefill from ?original= and ?converted= so an embed can target specific sites.
  const [params] = useState(() =>
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search)
      : new URLSearchParams()
  );

  return (
    <div className="mx-auto max-w-2xl p-4">
      <div className="overflow-hidden rounded-2xl border border-border bg-background p-4 shadow-[0_4px_30px_rgba(0,0,0,0.07)]">
        <h2 className="text-[15px] font-semibold">PageSpeed: Framer vs converted</h2>
        <p className="mt-1 text-[12px] text-muted-foreground">
          Real Lighthouse scores on desktop &amp; mobile.
        </p>
        <div className="mt-3">
          <SpeedCompare
            compact
            initialOriginal={params.get("original") || ""}
            initialConverted={params.get("converted") || ""}
          />
        </div>
      </div>
      <p className="mt-2 text-center text-[11px] text-muted-foreground">
        Powered by Framer → static converter
      </p>
    </div>
  );
}
