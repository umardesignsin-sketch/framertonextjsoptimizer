"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

/**
 * Card 01 of "See how every conversion works" — choosing the output format.
 *
 * The toggle and the progress bar used to be painted into card-01-a/-b, which
 * meant neither could move on its own. Both are lifted out into real elements
 * here (see public/illustrations/card01/), leaving the artwork to carry only
 * the dotted backdrop and the document itself. That buys a highlight that
 * slides between tabs and a bar that actually fills.
 *
 * Geometry is Figma's, on the same 393 × 285 board the SVGs use, scaled as a
 * whole to whatever the card allows.
 *
 * Naming note: the exports are inverted from what you'd guess — `-a` is the
 * "Improve Site Performance" / index.html frame, `-b` is "Convert to Next.js"
 * / Nextjs.zip.
 */

const W = 393;
const H = 285;
const SWITCH_MS = 3000;
// Card 03 flips on its own 3s beat from the moment it appears; starting half a
// beat later keeps the two from blinking in unison when both are on screen.
const OFFSET_MS = 1500;

type Mode = "nextjs" | "hybrid";

function ModeTabs({ value, onChange }: { value: Mode; onChange: (m: Mode) => void }) {
  const listRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLSpanElement>(null);
  const initialised = useRef(false);

  // Measured off the DOM rather than held in state — the active pill is wider
  // than the inactive one, so the highlight has to resize as well as move.
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
      void thumb.offsetWidth;
      thumb.classList.add("is-ready");
      initialised.current = true;
    }

    const ro = new ResizeObserver(place);
    ro.observe(list);
    return () => ro.disconnect();
  }, [value]);

  return (
    <div className="c1-toggle" role="tablist" aria-label="Conversion output" ref={listRef}>
      <span className="c1-toggle-thumb" ref={thumbRef} aria-hidden="true" />
      <button
        type="button"
        role="tab"
        aria-selected={value === "nextjs"}
        className={`c1-tab c1-tab--next${value === "nextjs" ? " is-active" : ""}`}
        onClick={() => onChange("nextjs")}
      >
        Convert to Next.js
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={value === "hybrid"}
        className={`c1-tab c1-tab--perf${value === "hybrid" ? " is-active" : ""}`}
        onClick={() => onChange("hybrid")}
      >
        Improve Site Performance
      </button>
    </div>
  );
}

export function Card01Story() {
  // mode and run move together so every switch also restarts the bar.
  const [{ mode, run }, setState] = useState<{ mode: Mode; run: number }>({
    mode: "nextjs",
    run: 0,
  });

  const fitRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const kickRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const visibleRef = useRef(false);

  useEffect(() => {
    const fit = fitRef.current;
    const stage = stageRef.current;
    if (!fit || !stage) return;
    const apply = () => {
      const r = fit.getBoundingClientRect();
      if (!r.width || !r.height) return;
      stage.style.setProperty("--c1-scale", String(Math.min(r.width / W, r.height / H)));
    };
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(fit);
    return () => ro.disconnect();
  }, []);

  // Stable identities so the observer effect below can depend on startTimer
  // without re-subscribing on every render.
  const clearTimers = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    if (kickRef.current) clearTimeout(kickRef.current);
    timerRef.current = null;
    kickRef.current = null;
  }, []);

  const flip = useCallback(
    () => setState((s) => ({ mode: s.mode === "nextjs" ? "hybrid" : "nextjs", run: s.run + 1 })),
    []
  );

  const startTimer = useCallback(
    (delay: number) => {
      clearTimers();
      kickRef.current = setTimeout(() => {
        flip();
        timerRef.current = setInterval(flip, SWITCH_MS);
      }, delay);
    },
    [clearTimers, flip]
  );

  useEffect(() => {
    const el = fitRef.current;
    if (!el) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          if (visibleRef.current) return;
          visibleRef.current = true;
          setState((s) => ({ ...s, run: s.run + 1 })); // fill the bar on first sight
          if (!reduced) startTimer(OFFSET_MS);
        } else {
          visibleRef.current = false;
          clearTimers();
        }
      },
      { threshold: 0.35 }
    );
    io.observe(el);
    return () => {
      io.disconnect();
      clearTimers();
    };
  }, [clearTimers, startTimer]);

  const pick = (m: Mode) => {
    setState((s) => (s.mode === m ? s : { mode: m, run: s.run + 1 }));
    if (visibleRef.current && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      startTimer(SWITCH_MS);
    }
  };

  return (
    <div className="mktg-card-illus">
      <div className="c1-fit" ref={fitRef}>
        <div className="c1-stage" ref={stageRef}>
          {/* Artwork: dotted backdrop + the document for the chosen output */}
          <span className={`c1-art${mode === "nextjs" ? " is-shown" : ""}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/illustrations/card01/base-b.svg" alt="" loading="lazy" decoding="async" />
          </span>
          <span className={`c1-art${mode === "hybrid" ? " is-shown" : ""}`}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/illustrations/card01/base-a.svg" alt="" loading="lazy" decoding="async" />
          </span>

          {/* Progress bar sits inside the document, at the artwork's own coords.
              Remounted on every switch so the fill keyframe replays. */}
          <span className="c1-bar" aria-hidden>
            <span key={run} className="c1-bar-fill" />
          </span>

          <ModeTabs value={mode} onChange={pick} />
        </div>
      </div>
    </div>
  );
}
