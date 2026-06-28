// Dev harness: convert a Framer URL and write the bundle to ./out for inspection.
//   npx tsx scripts/test-convert.ts <url> [maxPages] [maxImages]
import { promises as fs } from "node:fs";
import path from "node:path";
import { convertSite } from "../lib/convert";

const url = process.argv[2] || "https://framer.com";
const maxPages = Number(process.argv[3] || 1);
const maxImages = Number(process.argv[4] || 40);

function human(n: number) {
  if (n > 1e6) return (n / 1e6).toFixed(2) + " MB";
  if (n > 1e3) return (n / 1e3).toFixed(1) + " KB";
  return n + " B";
}

async function main() {
const t0 = Date.now();
const report = await convertSite(
  url,
  { maxPages, maxImages },
  (m) => console.log("  ·", m)
);

const outDir = path.join(process.cwd(), "out");
await fs.rm(outDir, { recursive: true, force: true });
for (const f of report.files) {
  const dest = path.join(outDir, f.path);
  await fs.mkdir(path.dirname(dest), { recursive: true });
  if (f.binary) await fs.writeFile(dest, f.binary);
  else await fs.writeFile(dest, f.content ?? "", "utf8");
}

console.log("\n===== REPORT =====");
console.log("source:", report.sourceUrl);
console.log("pages:", report.pages.map((p) => p.route).join(", "));
console.log("files written:", report.files.length, "→", outDir);
console.log("\nstats:");
for (const s of report.stats) {
  if (s.unit === "bytes") {
    const pct = s.before > 0 ? ((1 - s.after / s.before) * 100).toFixed(0) : "0";
    console.log(
      `  ${s.label}: ${human(s.before)} → ${human(s.after)}` +
        (s.label.includes("payload") && s.after < s.before ? ` (-${pct}%)` : "")
    );
  } else {
    console.log(`  ${s.label}: ${s.before}`);
  }
}
console.log("\nnotes:");
report.notes.forEach((n) => console.log("  -", n));
console.log("\nelapsed:", ((Date.now() - t0) / 1000).toFixed(1) + "s");
}

main().catch((e) => {
  console.error("CONVERT FAILED:", e instanceof Error ? e.message : e);
  process.exit(1);
});
