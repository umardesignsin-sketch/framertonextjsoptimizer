import { ImageResponse } from "next/og";
import { logoDataUri } from "@/lib/logo";

// Site-wide Open Graph / Twitter card image (1200×630), auto-wired by Next.js
// into OG + Twitter metadata for every route under app/.
//
// force-dynamic on purpose: next/og's ImageResponse rendering hits an
// intermittent native libvips crash on this stack ("colourspace: parameter
// space not set" — a real GLib/VipsInterpretation error, not application
// code) when Next tries to statically prerender it at BUILD time, which
// fails the entire build/deploy. Rendering per-request instead means a rare
// hiccup costs one failed image request, not a blocked deployment.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const alt = "Framer to Next.js Optimizer — convert and optimize Framer sites";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OgImage() {
  const logo = await logoDataUri();
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#0b0b0c",
          padding: 80,
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={logo} width={64} height={64} alt="" />
          <div style={{ color: "#9ca3af", fontSize: 30, fontWeight: 600 }}>framertonextjs.com</div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div style={{ color: "#ffffff", fontSize: 72, fontWeight: 800, lineHeight: 1.05, letterSpacing: -1.5 }}>
            Framer → Next.js
          </div>
          <div style={{ color: "#d1d5db", fontSize: 34, fontWeight: 500, lineHeight: 1.3, maxWidth: 900 }}>
            Convert any published Framer site into a fast, deployable Next.js project — top Lighthouse scores, edit and publish live.
          </div>
        </div>

        <div style={{ display: "flex", gap: 12 }}>
          {["Strip Framer runtime", "WebP images", "One-click deploy", "Visual editor"].map((t) => (
            <div
              key={t}
              style={{
                color: "#e5e7eb",
                fontSize: 24,
                fontWeight: 500,
                border: "1px solid #3f3f46",
                borderRadius: 999,
                padding: "10px 22px",
                display: "flex",
              }}
            >
              {t}
            </div>
          ))}
        </div>
      </div>
    ),
    size
  );
}
