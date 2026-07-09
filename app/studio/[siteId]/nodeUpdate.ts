// Immutable tree updates for the Studio design doc.
import type { DesignDoc, DesignNode, Breakpoint, StyleProps, NodeType } from "@/lib/design/types";
import { genId } from "@/lib/design/types";

function mapNode(node: DesignNode, id: string, fn: (n: DesignNode) => DesignNode): DesignNode {
  if (node.id === id) return fn(node);
  if (!node.children) return node;
  let changed = false;
  const children = node.children.map((c) => {
    const nc = mapNode(c, id, fn);
    if (nc !== c) changed = true;
    return nc;
  });
  return changed ? { ...node, children } : node;
}

function replaceRoot(doc: DesignDoc, pageId: string, fn: (root: DesignNode) => DesignNode): DesignDoc {
  return {
    ...doc,
    pages: doc.pages.map((p) => (p.id === pageId ? { ...p, root: fn(p.root) } : p)),
  };
}

export function updateNodeText(doc: DesignDoc, pageId: string, id: string, text: string): DesignDoc {
  return replaceRoot(doc, pageId, (root) => mapNode(root, id, (n) => ({ ...n, text })));
}

export function updateNodeField(
  doc: DesignDoc,
  pageId: string,
  id: string,
  field: "href" | "src" | "alt" | "name",
  value: string
): DesignDoc {
  return replaceRoot(doc, pageId, (root) => mapNode(root, id, (n) => ({ ...n, [field]: value })));
}

export function setNodeStyle(
  doc: DesignDoc,
  pageId: string,
  id: string,
  bp: Breakpoint,
  key: keyof StyleProps,
  value: StyleProps[keyof StyleProps] | undefined
): DesignDoc {
  return replaceRoot(doc, pageId, (root) =>
    mapNode(root, id, (n) => {
      const layer: StyleProps = { ...(n.styles[bp] || {}) };
      if (value === undefined || value === "") delete layer[key];
      else (layer[key] as StyleProps[keyof StyleProps]) = value;
      const styles = { ...n.styles, [bp]: layer };
      // Keep the desktop layer always present; drop empty override layers.
      if (bp !== "desktop" && Object.keys(layer).length === 0) delete styles[bp];
      return { ...n, styles };
    })
  );
}

function newNode(type: NodeType): DesignNode {
  const base: Record<NodeType, DesignNode> = {
    page: { id: genId("page"), type: "page", styles: { desktop: {} } },
    section: {
      id: genId("sec"),
      type: "section",
      name: "Section",
      styles: {
        desktop: {
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 12,
          paddingX: 64,
          paddingY: 64,
          background: "#ffffff",
          minHeight: 200,
        },
      },
      children: [],
    },
    heading: {
      id: genId("h"),
      type: "heading",
      text: "New heading",
      styles: { desktop: { fontSize: 34, fontWeight: 700, color: "#0b0b0c", textAlign: "center" } },
    },
    text: {
      id: genId("t"),
      type: "text",
      text: "New paragraph of text.",
      styles: { desktop: { fontSize: 17, lineHeight: 1.6, color: "#4b5563", textAlign: "center" } },
    },
    button: {
      id: genId("btn"),
      type: "button",
      text: "Button",
      href: "#",
      styles: {
        desktop: { fontSize: 16, fontWeight: 600, color: "#fff", background: "#111113", paddingX: 22, paddingY: 12, borderRadius: 10 },
      },
    },
    image: {
      id: genId("img"),
      type: "image",
      src: "",
      alt: "",
      styles: { desktop: { width: "320px", borderRadius: 12 } },
    },
  };
  return base[type];
}

/** Add a new node inside `parentId` (or the page root if it can't nest). */
export function addNode(
  doc: DesignDoc,
  pageId: string,
  parentId: string,
  type: NodeType
): { doc: DesignDoc; newId: string } {
  const node = newNode(type);
  const canNest = (t: NodeType) => t === "page" || t === "section";
  const next = replaceRoot(doc, pageId, (root) => {
    // Find a valid container: the target if it nests, else the root.
    const containerId = (() => {
      let found: DesignNode | null = null;
      const walk = (n: DesignNode) => {
        if (n.id === parentId) found = n;
        n.children?.forEach(walk);
      };
      walk(root);
      return found && canNest((found as DesignNode).type) ? parentId : root.id;
    })();
    return mapNode(root, containerId, (n) => ({ ...n, children: [...(n.children || []), node] }));
  });
  return { doc: next, newId: node.id };
}

export function deleteNode(doc: DesignDoc, pageId: string, id: string): DesignDoc {
  return replaceRoot(doc, pageId, (root) => {
    if (root.id === id) return root; // don't delete the page root
    const strip = (n: DesignNode): DesignNode => {
      if (!n.children) return n;
      const children = n.children.filter((c) => c.id !== id).map(strip);
      return { ...n, children };
    };
    return strip(root);
  });
}

export function moveNode(doc: DesignDoc, pageId: string, id: string, dir: -1 | 1): DesignDoc {
  return replaceRoot(doc, pageId, (root) => {
    const reorder = (n: DesignNode): DesignNode => {
      if (!n.children) return n;
      const idx = n.children.findIndex((c) => c.id === id);
      if (idx >= 0) {
        const j = idx + dir;
        if (j >= 0 && j < n.children.length) {
          const arr = [...n.children];
          [arr[idx], arr[j]] = [arr[j], arr[idx]];
          return { ...n, children: arr };
        }
      }
      return { ...n, children: n.children.map(reorder) };
    };
    return reorder(root);
  });
}
