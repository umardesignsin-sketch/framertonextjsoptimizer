// Diagnose why converted output renders blank: serve ./out, load headless, and
// report what's visible, what's hidden, and what large elements cover the page.
import http from "node:http";
import { promises as fs } from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const MIME: Record<string, string> = {
  ".html": "text/html", ".webp": "image/webp", ".png": "image/png",
  ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".svg": "image/svg+xml",
  ".woff2": "font/woff2", ".woff": "font/woff", ".ttf": "font/ttf",
  ".css": "text/css", ".ico": "image/x-icon",
};

function serve(root: string): Promise<{ port: number; close: () => void }> {
  const server = http.createServer(async (req, res) => {
    try {
      let p = decodeURIComponent((req.url || "/").split("?")[0]);
      if (p.endsWith("/")) p += "index.html";
      const buf = await fs.readFile(path.join(root, p));
      res.setHeader("content-type", MIME[path.extname(p)] || "application/octet-stream");
      res.end(buf);
    } catch { res.statusCode = 404; res.end("nf"); }
  });
  return new Promise((r) => server.listen(0, () => r({ port: (server.address() as { port: number }).port, close: () => server.close() })));
}

async function main() {
  const { port, close } = await serve(path.join(process.cwd(), "out"));
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1366, height: 900 } });
  await page.goto(`http://localhost:${port}/`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);

  const info = await page.evaluate(() => {
    const vw = window.innerWidth, vh = window.innerHeight;
    const out: Record<string, unknown> = {
      scrollHeight: document.body.scrollHeight,
      innerHeight: vh,
      totalEls: document.querySelectorAll("*").length,
    };
    let hiddenOpacity = 0, hiddenVis = 0, hiddenDisplay = 0;
    const covers: { tag: string; name: string; cls: string; w: number; h: number; bg: string; z: string; pos: string }[] = [];
    document.querySelectorAll<HTMLElement>("body *").forEach((el) => {
      const cs = getComputedStyle(el);
      if (parseFloat(cs.opacity) === 0) hiddenOpacity++;
      if (cs.visibility === "hidden") hiddenVis++;
      if (cs.display === "none") hiddenDisplay++;
      const r = el.getBoundingClientRect();
      // big elements covering most of the viewport (potential overlays)
      if (r.width >= vw * 0.85 && r.height >= vh * 0.7 && (cs.position === "fixed" || cs.position === "absolute")) {
        covers.push({
          tag: el.tagName, name: el.getAttribute("data-framer-name") || "",
          cls: el.className?.toString().slice(0, 40) || "",
          w: Math.round(r.width), h: Math.round(r.height),
          bg: cs.backgroundColor, z: cs.zIndex, pos: cs.position,
        });
      }
    });
    out.hiddenOpacity = hiddenOpacity;
    out.hiddenVis = hiddenVis;
    out.hiddenDisplay = hiddenDisplay;
    out.bigOverlays = covers.slice(0, 12);

    // Walk up from the visible logo to find the covering overlay.
    const mid = document.elementFromPoint(vw / 2, vh / 2) as HTMLElement | null;
    const chain: string[] = [];
    let cur: HTMLElement | null = mid;
    for (let i = 0; i < 8 && cur; i++) {
      const cs = getComputedStyle(cur);
      const r = cur.getBoundingClientRect();
      chain.push(
        `${cur.tagName} name="${cur.getAttribute("data-framer-name") || ""}" ` +
          `cls="${(cur.className?.toString() || "").slice(0, 30)}" ` +
          `pos=${cs.position} z=${cs.zIndex} bg=${cs.backgroundColor} ` +
          `${Math.round(r.width)}x${Math.round(r.height)} ` +
          `style="${(cur.getAttribute("style") || "").slice(0, 80)}"`
      );
      cur = cur.parentElement;
    }
    out.logoChain = chain;
    return out;
  });
  console.log(JSON.stringify(info, null, 2));
  await page.screenshot({ path: "shots/converted-fullpage.png", fullPage: true });
  console.log("fullpage -> shots/converted-fullpage.png");
  await browser.close();
  close();
}
main().catch((e) => { console.error("DIAG FAIL", e.message); process.exit(1); });
