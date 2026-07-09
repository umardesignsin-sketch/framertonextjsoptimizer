// POST /api/editor/[siteId]/upload — upload a replacement image for the
// visual editor (drag & drop / file picker). Stored in Vercel Blob with
// public access so the live site can serve it after publish.
import { put } from "@vercel/blob";
import { getAuthUser } from "@/lib/supabase/user";
import { db, dbConfigured } from "@/lib/db";

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

  if (!(process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID)) {
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
  const blob = await put(key, buf, { access: "public", contentType });
  return Response.json({ url: blob.url });
}
