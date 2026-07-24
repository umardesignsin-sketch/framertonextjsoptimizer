// GET /api/editor-uploads/{siteId}/{file} — serves images uploaded via the
// live editor. Stored privately through whichever driver is active (R2 or
// Vercel Blob — see lib/blob-driver.ts) and streamed back through our own
// route rather than a backend-specific public URL, so uploads work the same
// way regardless of which backend is configured, and an already-published
// image URL keeps resolving even if the backend is switched later.
import { activeDriver } from "@/lib/blob-driver";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MIME: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  webp: "image/webp",
  gif: "image/gif",
  svg: "image/svg+xml",
  avif: "image/avif",
};

function mimeFor(path: string): string {
  const ext = (path.split(".").pop() || "").toLowerCase();
  return MIME[ext] || "application/octet-stream";
}

export async function GET(_req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const key = `editor-images/${path.join("/")}`;

  const driver = activeDriver();
  if (!driver) return new Response("Not found", { status: 404 });

  const buf = await driver.getBuffer(key);
  if (!buf) return new Response("Not found", { status: 404 });

  return new Response(new Uint8Array(buf), {
    headers: {
      "Content-Type": mimeFor(key),
      // Filenames are content-random and never reused, so this is safe to
      // cache forever.
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
