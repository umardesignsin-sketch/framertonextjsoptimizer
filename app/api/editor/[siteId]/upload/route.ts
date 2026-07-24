// POST /api/editor/[siteId]/upload — upload a replacement image for the
// visual editor (drag & drop / file picker). Stored through whichever driver
// is active (R2 preferred, Vercel Blob fallback — see lib/blob-driver.ts)
// and served back through /api/editor-uploads/, an absolute framertonextjs.com
// URL that keeps resolving from a published site on a different domain.
import { activeDriver } from "@/lib/blob-driver";
import { getAuthUser } from "@/lib/supabase/user";
import { db, dbConfigured } from "@/lib/db";
import { SITE } from "@/lib/site-meta";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 8 * 1024 * 1024;
const EXT_BY_TYPE: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/svg+xml": "svg",
  "image/avif": "avif",
};

export async function POST(req: Request, { params }: { params: Promise<{ siteId: string }> }) {
  if (!dbConfigured()) return Response.json({ error: "Database not configured" }, { status: 503 });
  const { siteId } = await params;

  const user = await getAuthUser();
  if (!user?.id) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const site = await db.site.findFirst({ where: { id: siteId, ownerId: user.id } });
  if (!site) return Response.json({ error: "Not found" }, { status: 404 });

  const driver = activeDriver();
  if (!driver) {
    return Response.json(
      { error: "Image uploads aren't configured on this server — paste an image URL instead." },
      { status: 503 }
    );
  }

  const contentType = (req.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
  const ext = EXT_BY_TYPE[contentType];
  if (!ext) return Response.json({ error: "Unsupported image type" }, { status: 415 });

  const buf = await req.arrayBuffer();
  if (buf.byteLength === 0) return Response.json({ error: "Empty file" }, { status: 400 });
  if (buf.byteLength > MAX_BYTES) return Response.json({ error: "Image must be under 8 MB" }, { status: 413 });

  const key = `editor-images/${siteId}/${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  try {
    await driver.put(key, Buffer.from(buf), contentType, 31536000);
  } catch (err) {
    console.error(`editor upload failed (${driver.name}):`, err);
    return Response.json(
      { error: `Upload failed talking to storage (${driver.name}) — try again, or paste an image URL instead.` },
      { status: 502 }
    );
  }

  const relPath = key.slice("editor-images/".length);
  return Response.json({ url: `${SITE.url}/api/editor-uploads/${relPath}` });
}
