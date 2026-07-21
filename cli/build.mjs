// Bundle the CLI + the shared conversion pipeline (../lib) into a single
// self-contained dist/index.js. sharp (native) and cheerio stay external and
// are installed as real dependencies — keeping the install lean, which is the
// whole pitch of the CLI vs. a plugin-based export.
import { chmodSync, readFileSync } from "node:fs";
import esbuild from "esbuild";

const pkg = JSON.parse(readFileSync(new URL("./package.json", import.meta.url), "utf8"));

await esbuild.build({
  entryPoints: ["src/index.ts"],
  bundle: true,
  platform: "node",
  target: "node18",
  format: "cjs",
  outfile: "dist/index.js",
  external: ["sharp", "cheerio"],
  banner: { js: "#!/usr/bin/env node" },
  define: { __CLI_VERSION__: JSON.stringify(pkg.version) },
  logLevel: "info",
});

// Make the entry executable (npm's bin shim handles Windows; this covers *nix).
try {
  chmodSync("dist/index.js", 0o755);
} catch {
  /* non-fatal on platforms without POSIX perms */
}
