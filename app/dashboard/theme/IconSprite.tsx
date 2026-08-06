"use client";

import { HUGEICONS_SPRITE } from "./hugeicons-sprite";

// Injects the HugeIcons symbol sprite once so <Icon name="..."/> can reference
// it via <use href="#i-name">, matching the FNJ-APP design prototype.
export function IconSprite() {
  return (
    <div
      aria-hidden="true"
      style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }}
      dangerouslySetInnerHTML={{ __html: HUGEICONS_SPRITE }}
    />
  );
}
