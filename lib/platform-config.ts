// Platform config files baked into every converted bundle so the deployed site
// scores well regardless of host. The biggest host-to-host difference for a
// prebuilt static site is caching + how static assets are served: Netlify's zip
// deploy applies good defaults, but a raw Vercel deploy needs a vercel.json to
// get long-lived immutable caching and clean URLs. We include both.
import type { ConvertedFile } from "./types";

// Long-cache everything fingerprinted/static; HTML stays revalidated.
const IMMUTABLE = "public, max-age=31536000, immutable";
const ASSET_EXT =
  "webp|avif|png|jpg|jpeg|gif|svg|ico|woff2|woff|ttf|otf|mp4|webm|css|js|json";

function vercelJson(): string {
  return JSON.stringify(
    {
      cleanUrls: true,
      trailingSlash: false,
      headers: [
        {
          source: `/(.*)\\.(${ASSET_EXT})`,
          headers: [{ key: "Cache-Control", value: IMMUTABLE }],
        },
        {
          // HTML: cache at the edge but let it revalidate so content stays fresh.
          source: "/(.*)",
          headers: [
            { key: "Cache-Control", value: "public, max-age=0, must-revalidate" },
            { key: "X-Content-Type-Options", value: "nosniff" },
          ],
        },
      ],
    },
    null,
    2
  );
}

// Netlify _headers (parity for repeat-view caching).
function netlifyHeaders(): string {
  return [
    "/assets/*",
    `  Cache-Control: ${IMMUTABLE}`,
    "/*.webp",
    `  Cache-Control: ${IMMUTABLE}`,
    "/*.woff2",
    `  Cache-Control: ${IMMUTABLE}`,
    "/*.css",
    `  Cache-Control: ${IMMUTABLE}`,
    "/*.js",
    `  Cache-Control: ${IMMUTABLE}`,
    "",
  ].join("\n");
}

/** Config files to append to a converted bundle for optimal hosting. */
export function platformConfigFiles(): ConvertedFile[] {
  return [
    { path: "vercel.json", content: vercelJson() },
    { path: "_headers", content: netlifyHeaders() },
  ];
}
