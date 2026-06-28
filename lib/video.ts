// Restore background/inline videos. Framer ships <video> without autoplay
// attributes and starts playback via its JS runtime. With the runtime removed
// the video stays on a blank first frame (a common "missing hero background").
// Forcing muted+autoplay+loop+playsinline makes it play in a static page —
// muted autoplay is permitted by every browser without a user gesture.
import crypto from "node:crypto";
import type { Doc } from "./parse";

const VIDEO_HOST = /framerusercontent\.com/i;
const VIDEO_EXT = /\.(mp4|webm|mov|m4v)(\?|$)/i;

export function collectVideoUrls($: Doc): Set<string> {
  const urls = new Set<string>();
  const add = (u?: string | null) => {
    if (u && VIDEO_HOST.test(u) && VIDEO_EXT.test(u)) urls.add(u.trim());
  };
  $("video").each((_, el) => add($(el).attr("src")));
  $("video source").each((_, el) => add($(el).attr("src")));
  return urls;
}

export function videoLocalPath(url: string): string {
  const ext = (/\.([a-z0-9]+)(\?|$)/i.exec(url)?.[1] || "mp4").toLowerCase();
  const hash = crypto.createHash("sha1").update(url).digest("hex").slice(0, 16);
  return `/assets/media/${hash}.${ext}`;
}

export function rewriteVideoRefs($: Doc, map: Map<string, string>): void {
  const remap = (u?: string | null) => (u ? map.get(u.trim()) || null : null);
  $("video").each((_, el) => {
    const n = remap($(el).attr("src"));
    if (n) $(el).attr("src", n);
  });
  $("video source").each((_, el) => {
    const n = remap($(el).attr("src"));
    if (n) $(el).attr("src", n);
  });
}

export function fixVideos($: Doc): number {
  let fixed = 0;
  $("video").each((_, el) => {
    const $el = $(el);
    // muted is required for autoplay to be allowed
    $el.attr("muted", "");
    $el.prop("muted", true);
    $el.attr("autoplay", "");
    if ($el.attr("loop") === undefined) $el.attr("loop", "");
    $el.attr("playsinline", "");
    $el.attr("webkit-playsinline", "");
    // background videos shouldn't show controls
    $el.removeAttr("controls");
    if ($el.attr("preload") === undefined) $el.attr("preload", "auto");
    fixed++;
  });
  return fixed;
}
