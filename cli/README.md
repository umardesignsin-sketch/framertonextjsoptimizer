# framer-to-nextjs

Convert any **published Framer site** into a real, deployable Next.js project — or an optimized static bundle — straight from the command line.

No Framer login. No plugin. No project file. Just a public URL.

```bash
npx framer-to-nextjs https://your-site.framer.website
```

## Why

Framer is a great builder and a locked front door: your site is tied to Framer's hosting and a monthly subscription, shipped with a runtime you never chose. This CLI takes the published URL and hands you the code.

Unlike plugin-based exporters, it works from the **outside** — you don't need edit access to the Framer project, only its public URL.

## Usage

```
npx framer-to-nextjs <url> [options]
```

| Option | Description |
| --- | --- |
| `-m, --mode <mode>` | `nextjs` — a real Next.js App Router project (default). `hybrid` — an optimized static bundle with the Framer runtime stripped. |
| `-o, --out <dir>` | Output directory (default: `./framer-export`). |
| `--max-pages <n>` | Cap the number of pages crawled. |
| `-v, --version` | Print version. |
| `-h, --help` | Show help. |

### Examples

```bash
# A real Next.js project
npx framer-to-nextjs https://acme.framer.website --out ./acme

# The fastest, runtime-stripped static bundle
npx framer-to-nextjs https://acme.framer.website --mode hybrid --out ./acme
```

## The two modes

- **`nextjs`** — a genuine Next.js App Router project, one statically-prerendered route per page. Keeps Framer's runtime intact, so it renders byte-for-byte identical to the original. Run `npm install && npm run build` in the output folder.
- **`hybrid`** — strips Framer's JavaScript runtime and rebuilds a lean static bundle for the highest Lighthouse scores. Deploy the folder to any static host.

Both modes self-host and re-encode images to WebP and run an SEO/accessibility pass.

## What it can't do

- **Framer CMS content** bound to collections isn't crawled as dynamic data.
- **`hybrid`** trades a few interactions for speed (animations are re-created in CSS; complex page transitions may differ). Use `nextjs` when exact fidelity matters.

## Related

This is the command-line companion to [framertonextjs.com](https://framertonextjs.com), which does the same conversion in the browser with a visual editor and one-click deploy.

## License

MIT
