// Design-tool data model: pages are JSON component trees rendered on a canvas
// as editable blocks (NOT the live website). Styles cascade Desktop → Tablet →
// Mobile; only overridden values are stored per breakpoint.

export type NodeType = "page" | "section" | "heading" | "text" | "button" | "image";
export type Breakpoint = "desktop" | "tablet" | "mobile";

export const BREAKPOINTS: { id: Breakpoint; label: string; width: number }[] = [
  { id: "desktop", label: "Desktop", width: 1440 },
  { id: "tablet", label: "Tablet", width: 810 },
  { id: "mobile", label: "Mobile", width: 390 },
];

/** Styleable properties. Numbers are px unless noted. */
export interface StyleProps {
  // layout
  display?: "block" | "flex";
  flexDirection?: "row" | "column";
  gap?: number;
  alignItems?: "flex-start" | "center" | "flex-end" | "stretch";
  justifyContent?: "flex-start" | "center" | "flex-end" | "space-between";
  // sizing
  width?: string; // "auto" | "100%" | "480px"
  maxWidth?: number;
  minHeight?: number;
  // spacing
  paddingX?: number;
  paddingY?: number;
  marginTop?: number;
  marginBottom?: number;
  // typography
  fontSize?: number;
  fontWeight?: number;
  lineHeight?: number; // unitless multiplier
  letterSpacing?: number;
  color?: string;
  textAlign?: "left" | "center" | "right";
  // appearance / effects
  background?: string;
  borderRadius?: number;
  borderWidth?: number;
  borderColor?: string;
  opacity?: number; // 0..1
  shadow?: "none" | "sm" | "md" | "lg";
}

export interface DesignNode {
  id: string;
  type: NodeType;
  name?: string;
  text?: string; // heading / text / button
  src?: string; // image
  alt?: string; // image
  href?: string; // button
  styles: { desktop: StyleProps; tablet?: StyleProps; mobile?: StyleProps };
  children?: DesignNode[];
}

export interface DesignPage {
  id: string;
  name: string;
  root: DesignNode;
}

export interface DesignDoc {
  pages: DesignPage[];
}

// ---- ids ----
let counter = 0;
export function genId(prefix = "n"): string {
  // Deterministic-ish per session; uniqueness within a doc is what matters.
  counter = (counter + 1) % 1e6;
  return `${prefix}_${counter.toString(36)}${(Math.floor(performance.now?.() ?? 0) % 1e6).toString(36)}`;
}

// ---- breakpoint inheritance: resolve the effective style at a breakpoint ----
const ORDER: Breakpoint[] = ["desktop", "tablet", "mobile"];

export function resolveStyles(node: DesignNode, bp: Breakpoint): StyleProps {
  const upto = ORDER.slice(0, ORDER.indexOf(bp) + 1);
  return upto.reduce<StyleProps>((acc, b) => ({ ...acc, ...(node.styles[b] || {}) }), {});
}

/** Is this property overridden at this breakpoint (vs inherited)? */
export function isOverridden(node: DesignNode, bp: Breakpoint, key: keyof StyleProps): boolean {
  if (bp === "desktop") return node.styles.desktop[key] !== undefined;
  return node.styles[bp]?.[key] !== undefined;
}

// ---- CSS mapping ----
const SHADOWS: Record<string, string> = {
  none: "none",
  sm: "0 1px 2px rgba(0,0,0,0.08)",
  md: "0 6px 20px rgba(0,0,0,0.10)",
  lg: "0 20px 50px rgba(0,0,0,0.18)",
};

export function toCss(s: StyleProps): React.CSSProperties {
  const css: React.CSSProperties = {};
  if (s.display) css.display = s.display;
  if (s.display === "flex") {
    if (s.flexDirection) css.flexDirection = s.flexDirection;
    if (s.gap != null) css.gap = s.gap;
    if (s.alignItems) css.alignItems = s.alignItems;
    if (s.justifyContent) css.justifyContent = s.justifyContent;
  }
  if (s.width) css.width = s.width;
  if (s.maxWidth != null) css.maxWidth = s.maxWidth;
  if (s.minHeight != null) css.minHeight = s.minHeight;
  if (s.paddingX != null) {
    css.paddingLeft = s.paddingX;
    css.paddingRight = s.paddingX;
  }
  if (s.paddingY != null) {
    css.paddingTop = s.paddingY;
    css.paddingBottom = s.paddingY;
  }
  if (s.marginTop != null) css.marginTop = s.marginTop;
  if (s.marginBottom != null) css.marginBottom = s.marginBottom;
  if (s.fontSize != null) css.fontSize = s.fontSize;
  if (s.fontWeight != null) css.fontWeight = s.fontWeight;
  if (s.lineHeight != null) css.lineHeight = s.lineHeight;
  if (s.letterSpacing != null) css.letterSpacing = s.letterSpacing;
  if (s.color) css.color = s.color;
  if (s.textAlign) css.textAlign = s.textAlign;
  if (s.background) css.background = s.background;
  if (s.borderRadius != null) css.borderRadius = s.borderRadius;
  if (s.borderWidth != null) {
    css.borderStyle = "solid";
    css.borderWidth = s.borderWidth;
    css.borderColor = s.borderColor || "#e5e7eb";
  }
  if (s.opacity != null) css.opacity = s.opacity;
  if (s.shadow) css.boxShadow = SHADOWS[s.shadow] || "none";
  return css;
}

// ---- tree helpers ----
export function findNode(root: DesignNode, id: string): DesignNode | null {
  if (root.id === id) return root;
  for (const c of root.children || []) {
    const f = findNode(c, id);
    if (f) return f;
  }
  return null;
}

export function findParent(root: DesignNode, id: string): DesignNode | null {
  for (const c of root.children || []) {
    if (c.id === id) return root;
    const f = findParent(c, id);
    if (f) return f;
  }
  return null;
}

export function nodeLabel(n: DesignNode): string {
  if (n.name) return n.name;
  const t = n.type[0].toUpperCase() + n.type.slice(1);
  if (n.text) return `${t} · ${n.text.slice(0, 18)}`;
  return t;
}

// ---- a starter page so the canvas is immediately usable ----
export function defaultDoc(): DesignDoc {
  const heroHeading: DesignNode = {
    id: "hero-heading",
    type: "heading",
    text: "Design your site, block by block",
    styles: {
      desktop: { fontSize: 56, fontWeight: 700, lineHeight: 1.05, color: "#0b0b0c", textAlign: "center", maxWidth: 820 },
      tablet: { fontSize: 44 },
      mobile: { fontSize: 32 },
    },
  };
  const heroText: DesignNode = {
    id: "hero-text",
    type: "text",
    text: "Edit these blocks on the canvas. Each breakpoint inherits from Desktop — change Tablet or Mobile to override only what you need.",
    styles: {
      desktop: { fontSize: 18, lineHeight: 1.6, color: "#4b5563", textAlign: "center", maxWidth: 560, marginTop: 16 },
      mobile: { fontSize: 16 },
    },
  };
  const heroButton: DesignNode = {
    id: "hero-button",
    type: "button",
    text: "Get started",
    href: "#",
    styles: {
      desktop: {
        fontSize: 16,
        fontWeight: 600,
        color: "#ffffff",
        background: "#111113",
        paddingX: 24,
        paddingY: 14,
        borderRadius: 10,
        marginTop: 28,
      },
    },
  };
  const hero: DesignNode = {
    id: "section-hero",
    type: "section",
    name: "Hero",
    styles: {
      desktop: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 8,
        paddingX: 64,
        paddingY: 96,
        background: "#f6f6f7",
        minHeight: 520,
      },
      mobile: { paddingX: 24, paddingY: 64, minHeight: 420 },
    },
    children: [heroHeading, heroText, heroButton],
  };

  const featHeading: DesignNode = {
    id: "feat-heading",
    type: "heading",
    text: "What you can do",
    styles: { desktop: { fontSize: 34, fontWeight: 700, color: "#0b0b0c", textAlign: "center" }, mobile: { fontSize: 26 } },
  };
  const featText: DesignNode = {
    id: "feat-text",
    type: "text",
    text: "Select any block to edit its text, typography, spacing, layout, and effects in the right panel.",
    styles: { desktop: { fontSize: 17, lineHeight: 1.6, color: "#4b5563", textAlign: "center", maxWidth: 620, marginTop: 12 } },
  };
  const features: DesignNode = {
    id: "section-features",
    type: "section",
    name: "Features",
    styles: {
      desktop: { display: "flex", flexDirection: "column", alignItems: "center", gap: 6, paddingX: 64, paddingY: 88, background: "#ffffff" },
      mobile: { paddingX: 24, paddingY: 56 },
    },
    children: [featHeading, featText],
  };

  const root: DesignNode = {
    id: "page-root",
    type: "page",
    name: "Home",
    styles: { desktop: { display: "flex", flexDirection: "column", background: "#ffffff", width: "100%" } },
    children: [hero, features],
  };

  return { pages: [{ id: "home", name: "Home", root }] };
}
