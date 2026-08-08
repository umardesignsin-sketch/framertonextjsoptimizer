"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Card 04 of "See how every conversion works" — the finished files.
 *
 * The single card-04 export is split into three layers (index.html, Nextjs.zip
 * and the two buttons) that all keep the board's 248 × 245 viewBox, so stacking
 * them puts every piece back exactly where Figma drew it while letting each
 * animate on its own.
 *
 * Unlike cards 01 and 03 this doesn't loop: the stack builds once when the card
 * is first seen, then the two documents keep a very slight drift so the card
 * isn't completely dead afterwards.
 */

const W = 248;
const H = 245;

export function Card04Files() {
  const [entered, setEntered] = useState(false);
  const fitRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fit = fitRef.current;
    const stage = stageRef.current;
    if (!fit || !stage) return;
    const apply = () => {
      const r = fit.getBoundingClientRect();
      if (!r.width || !r.height) return;
      stage.style.setProperty("--c4-scale", String(Math.min(r.width / W, r.height / H)));
    };
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(fit);
    return () => ro.disconnect();
  }, []);

  // Fires once, the first time the card is actually on screen.
  useEffect(() => {
    const el = fitRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        const t = setTimeout(() => setEntered(true), 0);
        return () => clearTimeout(t);
      },
      { threshold: 0.35 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <div className="mktg-card-illus">
      <div className="c4-fit" ref={fitRef}>
        <div className={`c4-stage${entered ? " is-in" : ""}`} ref={stageRef} aria-hidden>
          {/* Back to front: the zip overlaps index.html, buttons sit below both */}
          <span className="c4-layer c4-layer--index">
            <span className="c4-float c4-float--index">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/illustrations/card04/doc-index.svg" alt="Generated index.html project file" loading="lazy" decoding="async" />
            </span>
          </span>
          <span className="c4-layer c4-layer--zip">
            <span className="c4-float c4-float--zip">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/illustrations/card04/doc-zip.svg" alt="Downloadable .zip project bundle" loading="lazy" decoding="async" />
            </span>
          </span>
          <span className="c4-layer c4-layer--buttons">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/illustrations/card04/buttons.svg" alt="" loading="lazy" decoding="async" />
          </span>
        </div>
      </div>
    </div>
  );
}
