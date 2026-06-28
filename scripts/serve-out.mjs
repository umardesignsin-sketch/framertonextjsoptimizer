// Minimal static file server for the converted ./out bundle (verification only).
//   node scripts/serve-out.mjs [port]
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import { join, extname, normalize, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// Anchor to <project>/out relative to this script, not the launcher's cwd.
const here = dirname(fileURLToPath(import.meta.url));
const root = normalize(join(here, "..", "out"));
const port = Number(process.argv[2] || 3002);

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css",
  ".js": "text/javascript",
  ".mjs": "text/javascript",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".avif": "image/avif",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
};

const server = createServer(async (req, res) => {
  try {
    let p = decodeURIComponent((req.url || "/").split("?")[0]);
    if (p.endsWith("/")) p += "index.html";
    const full = normalize(join(root, p));
    if (!full.startsWith(root)) {
      res.writeHead(403).end("forbidden");
      return;
    }
    let target = full;
    try {
      if ((await stat(target)).isDirectory()) target = join(target, "index.html");
    } catch {
      /* fall through to readFile error */
    }
    const body = await readFile(target);
    res.writeHead(200, { "Content-Type": MIME[extname(target)] || "application/octet-stream" });
    res.end(body);
  } catch {
    res.writeHead(404).end("not found");
  }
});

server.listen(port, () => console.log(`serving ./out on http://localhost:${port}`));
