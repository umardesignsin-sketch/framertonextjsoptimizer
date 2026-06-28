// Remove stuck "on-top" overlays — loading/intro screens, page-transition
// covers, custom-cursor layers — that Framer's JS normally animates away. With
// the runtime gone they sit frozen over the hero (the classic blank/stuck page).
//
// Safe heuristic: an element is an on-top overlay when it is position:fixed,
// covers (about) the whole viewport, AND has a high stacking z-index. Legit
// full-bleed *backgrounds* sit at low/auto z-index, so the z-index gate keeps
// them. Menu/nav overlays are left for the hamburger script to manage.
import type { Doc } from "./parse";

const Z_THRESHOLD = 1000;
const MENU_NAME = /menu|nav|drawer|hamburger/i;

interface Decl {
  position?: string;
  width?: string;
  height?: string;
  zIndex?: number;
}

function parseInline(style: string): Decl {
  const get = (prop: string) => {
    const m = new RegExp(`(?:^|;)\\s*${prop}\\s*:\\s*([^;]+)`, "i").exec(style);
    return m ? m[1].trim() : undefined;
  };
  const z = get("z-index");
  return {
    position: get("position"),
    width: get("width"),
    height: get("height"),
    zIndex: z ? parseInt(z, 10) : undefined,
  };
}

function coversViewport(d: Decl): boolean {
  const w = (d.width || "").toLowerCase();
  const h = (d.height || "").toLowerCase();
  const fullW = w === "100vw" || w === "100%";
  const fullH = h === "100vh" || h === "100%" || h === "100dvh";
  return fullW && fullH;
}

export function removeStuckOverlays($: Doc): number {
  let removed = 0;
  $("[style]").each((_, el) => {
    const $el = $(el);
    const name = $el.attr("data-framer-name") || "";
    if (MENU_NAME.test(name)) return; // let the hamburger script own these

    const d = parseInline($el.attr("style") || "");
    if (d.position !== "fixed") return;
    if (!coversViewport(d)) return;
    if ((d.zIndex ?? 0) < Z_THRESHOLD) return;

    $el.remove();
    removed++;
  });
  return removed;
}
