// Visual verification: screenshot the converted bundle (served from ./out) and
// the original live site, at desktop + mobile, for before/after comparison.
//   npx tsx scripts/verify-render.ts <originalUrl>
import http from "node:http";
import { promises as fs } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const original = process.argv[2] || "https://framer.com";
const outDir = path.join(process.cwd(), "out");
const shotDir = path.join(process.cwd(), "shots");

const MIME: Record<string, string> = {
  ".html": "text/html",
  ".webp": "image/webp",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".ttf": "font/ttf",
  ".css": "text/css",
  ".ico": "image/x-icon",
};

function serve(root: string): Promise<{ port: number; close: () => void }> {
  const server = http.createServer(async (req, res) => {
    try {
      let p = decodeURIComponent((req.url || "/").split("?")[0]);
      if (p.endsWith("/")) p += "index.html";
      const file = path.join(root, p);
      const buf = await fs.readFile(file);
      res.setHeader("content-type", MIME[path.extname(file)] || "application/octet-stream");
      res.end(buf);
    } catch {
      res.statusCode = 404;
      res.end("not found");
    }
  });
  return new Promise((resolve) => {
    server.listen(0, () => {
      const port = (server.address() as { port: number }).port;
      resolve({ port, close: () => server.close() });
    });
  });
}

async function main() {
  await fs.mkdir(shotDir, { recursive: true });
  const { port, close } = await serve(outDir);
  const convertedUrl = `http://localhost:${port}/`;
  const browser = await chromium.launch();

  const shots: { name: string; url: string; mobile: boolean; jsEnabled: boolean }[] = [
    { name: "converted-desktop", url: convertedUrl, mobile: false, jsEnabled: true },
    { name: "converted-mobile", url: convertedUrl, mobile: true, jsEnabled: true },
    { name: "original-desktop", url: original, mobile: false, jsEnabled: true },
    { name: "original-mobile", url: original, mobile: true, jsEnabled: true },
  ];

  for (const s of shots) {
    const ctx = await browser.newContext({
      viewport: s.mobile ? { width: 390, height: 844 } : { width: 1366, height: 900 },
      deviceScaleFactor: 1,
      userAgent:
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
    });
    const page = await ctx.newPage();
    try {
      await page.goto(s.url, { waitUntil: "networkidle", timeout: 45000 });
    } catch {
      await page.goto(s.url, { waitUntil: "domcontentloaded", timeout: 45000 }).catch(() => {});
    }
    await page.waitForTimeout(1500);
    const file = path.join(shotDir, s.name + ".png");
    await page.screenshot({ path: file, fullPage: false });
    console.log("shot:", s.name, "→", file);
    await ctx.close();
  }

  await browser.close();
  close();
  console.log("done");
}

main().catch((e) => {
  console.error("VERIFY FAILED:", e instanceof Error ? e.message : e);
  process.exit(1);
});
