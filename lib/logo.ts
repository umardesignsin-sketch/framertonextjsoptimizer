// Rasterized logo for contexts that can't reliably render inline SVG —
// next/og's Satori renderer has only partial SVG support (uncertain with
// <use>/<defs>/gradients), so OG images embed a PNG data URI instead of the
// raw public/icon.svg markup.
//
// Reads a PRE-GENERATED static PNG (public/logo-192.png) rather than
// rasterizing public/icon.svg via sharp at request time — sharp/libvips hit
// an intermittent "colourspace: parameter space not set" error rendering
// this SVG on this stack, so sharp is kept out of the request path entirely.
// Regenerate the PNG with:
//   node -e "const sharp=require('sharp'),fs=require('fs'); sharp(fs.readFileSync('public/icon.svg'),{density:384}).resize(192,192).png().toBuffer().then(b=>fs.writeFileSync('public/logo-192.png',b))"
import { readFile } from "node:fs/promises";
import path from "node:path";

let cached: string | null = null;

export async function logoDataUri(): Promise<string> {
  if (cached) return cached;
  const png = await readFile(path.join(process.cwd(), "public", "logo-192.png"));
  cached = `data:image/png;base64,${png.toString("base64")}`;
  return cached;
}
