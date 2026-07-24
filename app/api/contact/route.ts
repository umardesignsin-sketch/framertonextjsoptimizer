// POST /api/contact — the "Need help?" badge (components/HelpBadge.tsx).
// Always stored in the DB first (the durable record); email notification to
// SITE.contactEmail is best-effort on top, only when RESEND_API_KEY is set.
// No API key configured yet? The message still lands and is visible at
// /admin/messages — nothing is silently lost while email delivery is dormant.
import { db, dbConfigured } from "@/lib/db";
import { SITE } from "@/lib/site-meta";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_MESSAGE = 4000;

async function notifyByEmail(email: string, message: string, page: string | null): Promise<boolean> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) return false;
  try {
    const { Resend } = await import("resend");
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      // resend.dev is Resend's shared sandbox sender — works with no domain
      // verification. Swap for a verified @framertonextjs.com address once
      // the domain is added in the Resend dashboard.
      from: "Framer to Next.js <onboarding@resend.dev>",
      to: SITE.contactEmail,
      replyTo: email,
      subject: `Need help — message from ${email}`,
      text: `${message}\n\n—\nFrom: ${email}\nPage: ${page || "(unknown)"}`,
    });
    return !error;
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  if (!dbConfigured()) return Response.json({ error: "Not configured" }, { status: 503 });

  let body: { email?: string; message?: string; page?: string } = {};
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: "Invalid request" }, { status: 400 });
  }

  const email = (body.email || "").trim().slice(0, 200);
  const message = (body.message || "").trim().slice(0, MAX_MESSAGE);
  const page = (body.page || "").trim().slice(0, 200) || null;

  if (!EMAIL_RE.test(email)) return Response.json({ error: "Enter a valid email" }, { status: 400 });
  if (!message) return Response.json({ error: "Message can't be empty" }, { status: 400 });

  const row = await db.contactMessage.create({ data: { email, message, page } });
  const emailed = await notifyByEmail(email, message, page);
  if (emailed) {
    await db.contactMessage.update({ where: { id: row.id }, data: { emailed: true } }).catch(() => {});
  }

  return Response.json({ ok: true });
}
