"use client";

import { useLayoutEffect, useRef } from "react";

export type OutputMode = "hybrid" | "nextjs";

/**
 * The hero's segmented control, shared by the home page and the repeated CTA
 * at the foot of the marketing pages so the interaction only lives in one
 * place.
 *
 * The two labels are very different lengths, so the sliding highlight can't be
 * a fixed 50% — it's measured off the active button and driven through inline
 * styles on a ref rather than React state, which keeps the measure-and-place
 * out of the render cycle entirely.
 *
 * Until the effect runs (server render, or JS disabled) the highlight stays
 * hidden and the active tab keeps its own flat background, so the control is
 * never in a state where nothing looks selected. `is-animated` hands over to
 * the sliding highlight; `is-ready` then enables the transition, one frame
 * later, so the first placement doesn't animate in from zero width.
 */
export function ModeToggle({
  value,
  onChange,
}: {
  value: OutputMode;
  onChange: (mode: OutputMode) => void;
}) {
  const listRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLSpanElement>(null);
  const initialised = useRef(false);

  useLayoutEffect(() => {
    const list = listRef.current;
    const thumb = thumbRef.current;
    if (!list || !thumb) return;

    const place = () => {
      const active = list.querySelector<HTMLElement>('[aria-selected="true"]');
      if (!active) return;
      thumb.style.width = `${active.offsetWidth}px`;
      thumb.style.transform = `translateX(${active.offsetLeft}px)`;
    };

    place();

    if (!initialised.current) {
      list.classList.add("is-animated");
      // Flush the placement above before the transition is attached, so the
      // highlight appears already under the active tab instead of sliding
      // over from the left edge on first paint.
      void thumb.offsetWidth;
      thumb.classList.add("is-ready");
      initialised.current = true;
    }

    // Labels reflow at the mobile breakpoint, which moves the target.
    const ro = new ResizeObserver(place);
    ro.observe(list);
    return () => ro.disconnect();
  }, [value]);

  return (
    <div className="mktg-toggle" role="tablist" aria-label="Conversion output" ref={listRef}>
      <span className="mktg-toggle-thumb" ref={thumbRef} aria-hidden="true" />
      <button
        type="button"
        role="tab"
        aria-selected={value === "nextjs"}
        className={`mktg-tab${value === "nextjs" ? " is-active" : ""}`}
        onClick={() => onChange("nextjs")}
      >
        Convert to Next.js
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={value === "hybrid"}
        className={`mktg-tab${value === "hybrid" ? " is-active" : ""}`}
        onClick={() => onChange("hybrid")}
      >
        Improve Site Performance
      </button>
    </div>
  );
}
