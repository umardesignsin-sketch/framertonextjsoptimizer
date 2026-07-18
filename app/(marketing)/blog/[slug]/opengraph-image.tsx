import { ImageResponse } from "next/og";
import { getPublishedPost } from "@/lib/blog";

export const runtime = "nodejs";
export const alt = "Framer → Next.js Optimizer blog post";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function BlogOgImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const post = await getPublishedPost(slug).catch(() => null);
  const title = post?.title || "Framer → Next.js Optimizer";

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
        <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              background: "#ffffff",
              color: "#0b0b0c",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 36,
              fontWeight: 800,
            }}
          >
            F
          </div>
          <div style={{ color: "#9ca3af", fontSize: 28, fontWeight: 600 }}>framertonextjs.com/blog</div>
        </div>

        <div
          style={{
            color: "#ffffff",
            fontSize: title.length > 60 ? 56 : 68,
            fontWeight: 800,
            lineHeight: 1.1,
            letterSpacing: -1.5,
            display: "flex",
          }}
        >
          {title.slice(0, 120)}
        </div>

        <div style={{ color: "#d1d5db", fontSize: 28, fontWeight: 500, display: "flex" }}>
          Convert Framer sites to Next.js — fast, optimized, deployable.
        </div>
      </div>
    ),
    size
  );
}
