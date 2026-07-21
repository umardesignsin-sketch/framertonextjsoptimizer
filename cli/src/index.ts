import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { convertToNextJs } from "../../lib/nextjs-export";
import { convertSite } from "../../lib/convert";
import type { ConvertReport, OptimizationStat } from "../../lib/types";

// Injected at build time by build.mjs (esbuild `define`).
declare const __CLI_VERSION__: string;
const VERSION = typeof __CLI_VERSION__ === "string" ? __CLI_VERSION__ : "0.0.0";

// ---- tiny ANSI helpers (no dependency — the whole point is a lean install) ----
const useColor = process.stdout.isTTY && !process.env.NO_COLOR;
const c = {
  dim: (s: string) => (useColor ? `\x1b[2m${s}\x1b[0m` : s),
  bold: (s: string) => (useColor ? `\x1b[1m${s}\x1b[0m` : s),
  green: (s: string) => (useColor ? `\x1b[32m${s}\x1b[0m` : s),
  red: (s: string) => (useColor ? `\x1b[31m${s}\x1b[0m` : s),
  cyan: (s: string) => (useColor ? `\x1b[36m${s}\x1b[0m` : s),
};

type Mode = "nextjs" | "hybrid";

interface Args {
  url?: string;
  mode: Mode;
  out: string;
  maxPages?: number;
  help: boolean;
  version: boolean;
}

const HELP = `${c.bold("framer-to-nextjs")} — convert a published Framer site into real code

${c.bold("Usage")}
  npx framer-to-nextjs <url> [options]

${c.bold("Arguments")}
  <url>                 A published Framer URL (e.g. https://your-site.framer.website)

${c.bold("Options")}
  -m, --mode <mode>     ${c.cyan("nextjs")} — a real, deployable Next.js App Router project (default)
                        ${c.cyan("hybrid")} — an optimized static bundle (Framer runtime stripped)
  -o, --out <dir>       Output directory (default: ./framer-export)
      --max-pages <n>   Cap the number of pages crawled
  -v, --version         Print version and exit
  -h, --help            Show this help

${c.bold("Examples")}
  npx framer-to-nextjs https://acme.framer.website
  npx framer-to-nextjs https://acme.framer.website --mode hybrid --out ./site
  npx framer-to-nextjs https://acme.framer.website -m nextjs -o ./acme --max-pages 10

${c.dim("Works from a public URL — no Framer login, no plugin, no project file.")}
`;

function parseArgs(argv: string[]): Args {
  const args: Args = { mode: "nextjs", out: "./framer-export", help: false, version: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    switch (a) {
      case "-h":
      case "--help":
        args.help = true;
        break;
      case "-v":
      case "--version":
        args.version = true;
        break;
      case "-m":
      case "--mode": {
        const v = argv[++i];
        if (v !== "nextjs" && v !== "hybrid") {
          fail(`Invalid --mode "${v ?? ""}". Expected "nextjs" or "hybrid".`);
        }
        args.mode = v as Mode;
        break;
      }
      case "-o":
      case "--out":
        args.out = argv[++i] ?? args.out;
        break;
      case "--max-pages": {
        const n = Number(argv[++i]);
        if (!Number.isFinite(n) || n < 1) fail(`Invalid --max-pages value.`);
        args.maxPages = Math.floor(n);
        break;
      }
      default:
        if (a.startsWith("-")) fail(`Unknown option "${a}". Run with --help.`);
        else if (!args.url) args.url = a;
        else fail(`Unexpected extra argument "${a}".`);
    }
  }
  return args;
}

function fail(msg: string): never {
  process.stderr.write(`${c.red("error")} ${msg}\n`);
  process.exit(1);
}

function fmtBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

function fmtStat(s: OptimizationStat): string {
  if (s.unit === "bytes") {
    const saved = s.before > 0 ? Math.round((1 - s.after / s.before) * 100) : 0;
    const delta = saved > 0 ? c.green(` (−${saved}%)`) : "";
    return `${s.label}: ${fmtBytes(s.before)} → ${fmtBytes(s.after)}${delta}`;
  }
  if (s.unit === "ms") return `${s.label}: ${s.after} ms`;
  return `${s.label}: ${s.after}`;
}

function writeFiles(report: ConvertReport, outDir: string): number {
  let written = 0;
  for (const f of report.files) {
    const p = join(outDir, f.path);
    mkdirSync(dirname(p), { recursive: true });
    if (typeof f.content === "string") writeFileSync(p, f.content);
    else if (f.binary) writeFileSync(p, f.binary);
    else continue;
    written++;
  }
  return written;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.version) {
    process.stdout.write(`${VERSION}\n`);
    return;
  }
  if (args.help || !args.url) {
    process.stdout.write(HELP);
    process.exit(args.url ? 0 : args.help ? 0 : 1);
  }

  const outDir = resolve(process.cwd(), args.out);
  const label = args.mode === "nextjs" ? "Pure Next.js project" : "optimized static bundle";
  process.stderr.write(`\n${c.bold("framer-to-nextjs")} ${c.dim(`v${VERSION}`)}\n`);
  process.stderr.write(`${c.dim("source")}  ${args.url}\n`);
  process.stderr.write(`${c.dim("mode")}    ${args.mode} ${c.dim(`(${label})`)}\n`);
  process.stderr.write(`${c.dim("output")}  ${outDir}\n\n`);

  const onProgress = (msg: string) => process.stderr.write(`${c.dim("·")} ${msg}\n`);

  let report: ConvertReport;
  try {
    report =
      args.mode === "nextjs"
        ? await convertToNextJs(args.url, onProgress)
        : await convertSite(
            args.url,
            { mode: "hybrid", ...(args.maxPages ? { maxPages: args.maxPages } : {}) },
            onProgress
          );
  } catch (err) {
    fail(err instanceof Error ? err.message : String(err));
  }

  const written = writeFiles(report, outDir);

  process.stderr.write(`\n${c.green("✓")} ${c.bold("Done.")} Wrote ${written} files to ${c.cyan(args.out)}\n\n`);
  process.stderr.write(`  ${report.pages.length} page(s) converted\n`);
  for (const s of report.stats) process.stderr.write(`  ${fmtStat(s)}\n`);

  // Next steps depend on the output kind.
  process.stderr.write(`\n${c.bold("Next steps")}\n`);
  if (args.mode === "nextjs") {
    process.stderr.write(`  cd ${args.out}\n  npm install\n  npm run build\n`);
  } else {
    process.stderr.write(`  Deploy the ${c.cyan(args.out)} folder to any static host,\n`);
    process.stderr.write(`  or preview it locally: ${c.dim(`npx serve ${args.out}`)}\n`);
  }
  process.stderr.write("\n");
}

main().catch((err) => fail(err instanceof Error ? err.message : String(err)));
