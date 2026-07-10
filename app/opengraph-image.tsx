import { ImageResponse } from "next/og";

// Site-wide Open Graph / Twitter card image (1200×630), auto-wired by Next.js
// into OG + Twitter metadata for every route under app/.
export const runtime = "nodejs";
export const alt = "Framer to Next.js Optimizer — convert and optimize Framer sites";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
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
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 16,
              background: "#ffffff",
              color: "#0b0b0c",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 42,
              fontWeight: 800,
            }}
          >
            F
          </div>
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
