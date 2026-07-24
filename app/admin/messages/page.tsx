import { db, dbConfigured } from "@/lib/db";
import { AdminHeader } from "../AdminHeader";
import { Icon } from "../icons";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function fmtFull(d: Date): string {
  return d.toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

export default async function AdminMessagesPage() {
  if (!dbConfigured()) {
    return (
      <div className="min-h-screen bg-muted/30">
        <AdminHeader />
        <div className="mx-auto max-w-2xl px-5 py-16 text-center text-sm text-muted-foreground">
          Set <code>DATABASE_URL</code> to view messages.
        </div>
      </div>
    );
  }

  const messages = await db.contactMessage.findMany({ orderBy: { createdAt: "desc" }, take: 200 }).catch(() => []);
  const emailConfigured = !!process.env.RESEND_API_KEY;

  return (
    <div className="min-h-screen bg-muted/30">
      <AdminHeader />

      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-5 sm:py-8">
        <h1 className="text-xl font-semibold tracking-tight text-foreground sm:text-2xl">Messages</h1>
        <p className="mt-1 text-[13px] text-muted-foreground">
          Submissions from the site&apos;s &ldquo;Need help?&rdquo; badge.
          {!emailConfigured && (
            <>
              {" "}
              Email delivery isn&apos;t configured yet (<code>RESEND_API_KEY</code> unset) — messages land here
              only, nothing is emailed.
            </>
          )}
        </p>

        <section className="mt-5 space-y-2.5">
          {messages.length === 0 ? (
            <div className="rounded-2xl border border-border bg-background p-8 text-center text-[13px] text-muted-foreground">
              No messages yet.
            </div>
          ) : (
            messages.map((m) => (
              <div key={m.id} className="rounded-2xl border border-border bg-background p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[13.5px] font-medium text-foreground">{m.email}</span>
                  <div className="flex items-center gap-2 text-[11.5px] text-muted-foreground">
                    {m.emailed ? (
                      <span className="flex items-center gap-1 text-emerald-600">
                        <Icon name="check" size={10} /> emailed
                      </span>
                    ) : (
                      <span>not emailed</span>
                    )}
                    <span title={fmtFull(m.createdAt)}>{fmtFull(m.createdAt)}</span>
                  </div>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-[13.5px] leading-relaxed text-foreground">{m.message}</p>
                {m.page && <p className="mt-2 text-[11.5px] text-muted-foreground">from {m.page}</p>}
              </div>
            ))
          )}
        </section>
      </div>
    </div>
  );
}
