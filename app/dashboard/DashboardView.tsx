"use client";

import { signOut } from "next-auth/react";
import Link from "next/link";

interface DeploymentRow {
  id: string;
  provider: string;
  status: string;
  url: string | null;
  createdAt: string;
}
interface SiteRow {
  id: string;
  name: string;
  framerUrl: string;
  outputKind: string;
  status: string;
  themeRef: string | null;
  createdAt: string;
  canAutoDeploy: boolean;
  deployments: DeploymentRow[];
}

function fmtDate(iso: string): string {
  try {
    // Fixed locale: server and client default locales can differ, which
    // causes a hydration mismatch if left unspecified.
    return new Date(iso).toLocaleString("en-US");
  } catch {
    return "—";
  }
}

export function DashboardView({ email, sites }: { email: string; sites: SiteRow[] }) {
  return (
    <div className="mx-auto max-w-5xl px-5 py-10">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Dashboard</h1>
          <p className="mt-1 text-[13px] text-muted-foreground">{email}</p>
        </div>
        <div className="flex items-center gap-3">
          <Link href="/" className="text-[13px] underline">
            New conversion
          </Link>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="rounded-lg border border-border-strong px-3 py-1.5 text-[13px] hover:border-foreground"
          >
            Log out
          </button>
        </div>
      </header>

      <section className="mt-8">
        <h2 className="font-medium">Sites &amp; conversions ({sites.length})</h2>
        {sites.length === 0 ? (
          <p className="mt-3 text-[13px] text-muted-foreground">
            No conversions yet.{" "}
            <Link href="/" className="underline">
              Convert a Framer site
            </Link>{" "}
            while logged in to see it here.
          </p>
        ) : (
          <div className="mt-3 space-y-4">
            {sites.map((s) => (
              <div key={s.id} className="overflow-hidden rounded-xl border border-border">
                <div className="flex items-center justify-between border-b border-border bg-foreground/5 px-4 py-2.5">
                  <div>
                    <span className="font-medium">{s.name}</span>
                    <span className="ml-2 rounded-full border border-border-strong px-2 py-0.5 text-[11px] text-muted-foreground">
                      {s.outputKind === "nextjs" ? "Pure Next.js" : "Hybrid"}
                    </span>
                  </div>
                  <span className="text-[12px] text-muted-foreground">{fmtDate(s.createdAt)}</span>
                </div>
                <div className="px-4 py-3 text-[13px]">
                  <p className="truncate text-muted-foreground" title={s.framerUrl}>
                    {s.framerUrl}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-3">
                    <span>Status: {s.status}</span>
                    {s.themeRef && (
                      <Link
                        href={`/editor/${s.id}`}
                        className="rounded-lg bg-foreground px-3 py-1.5 text-[12px] font-medium text-background hover:opacity-90"
                      >
                        ✎ Edit site
                      </Link>
                    )}
                    {s.themeRef && (
                      <a href={`/api/download/${s.themeRef}`} className="underline">
                        Download bundle
                      </a>
                    )}
                  </div>

                  <div className="mt-3">
                    <h3 className="text-[12px] font-medium text-muted-foreground">
                      Deployed files ({s.deployments.length})
                    </h3>
                    {s.deployments.length === 0 ? (
                      <p className="mt-1 text-[12px] text-muted-foreground">
                        Not deployed yet.{" "}
                        {!s.canAutoDeploy &&
                          "Deploy once with “Save deploy for live editing” checked to publish edits straight to your live site."}
                      </p>
                    ) : (
                      <ul className="mt-1 space-y-1">
                        {s.deployments.map((d) => (
                          <li key={d.id} className="flex items-center gap-2 text-[12px]">
                            <span className="rounded border border-border-strong px-1.5 py-0.5">
                              {d.provider}
                            </span>
                            <span>{d.status}</span>
                            {d.url && (
                              <a href={d.url} target="_blank" rel="noopener noreferrer" className="underline">
                                {d.url}
                              </a>
                            )}
                            <span className="text-muted-foreground">{fmtDate(d.createdAt)}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
