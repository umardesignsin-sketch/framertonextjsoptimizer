"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Card 02 of "See how every conversion works", rebuilt as real DOM.
 *
 * It used to be two flat SVGs (card-02-a / card-02-b) crossfading into each
 * other. Nothing inside a flat picture can move on its own, so the sequence the
 * design calls for — press Copy link, open a new tab, paste, submit, then run a
 * status line — is assembled here out of individual elements instead.
 *
 * Geometry is Figma's, to the pixel: node 5:333 (frame A) and 5:664 (frame B),
 * both drawn on a 396×260 board. The board is laid out at that exact size and
 * then scaled to whatever the card gives it, so the numbers below can stay the
 * literal design values rather than a pile of percentages.
 */

const W = 396;
const H = 260;

type Phase =
  | "idle" // frame A at rest, URL selected, tooltip showing
  | "copy" // Copy link pressed
  | "newtab" // plus pressed
  | "browse" // frame B, converter open, input still empty
  | "paste" // URL lands in the input
  | "submit" // Get Next.js file pressed
  | "checking"
  | "converting"
  | "converted"
  | "reset"; // ease back to frame A before looping

type Press = "copy" | "plus" | "cta";

// One pass of the story. Times are absolute ms from the start of the loop so
// the whole schedule is readable in one column rather than as nested delays.
const STEPS: { at: number; phase: Phase; press?: Press }[] = [
  { at: 0, phase: "idle" },
  { at: 1000, phase: "copy", press: "copy" },
  { at: 1900, phase: "newtab", press: "plus" },
  { at: 2250, phase: "browse" },
  { at: 3450, phase: "paste" },
  { at: 4500, phase: "submit", press: "cta" },
  { at: 5000, phase: "checking" },
  { at: 6600, phase: "converting" },
  { at: 8400, phase: "converted" },
  { at: 10600, phase: "reset" },
];
const LOOP_MS = 11400;
const PRESS_MS = 220;

// Phases from "browse" onward are the second tab; everything before (and the
// "reset" tail) is the original Framer tab.
const ORDER: Phase[] = [
  "idle", "copy", "newtab", "browse", "paste",
  "submit", "checking", "converting", "converted", "reset",
];
const rank = (p: Phase) => ORDER.indexOf(p);

const STATUS_LABELS = ["Checking link", "Converting", "Converted"] as const;

export function Card02Story() {
  const [phase, setPhase] = useState<Phase>("idle");
  const [press, setPress] = useState<Press | null>(null);
  const fitRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  // The board is built at 396×260 and scaled down to fit. Measuring both axes
  // means it stays correct even when the card gives it an odd-shaped box.
  useEffect(() => {
    const fit = fitRef.current;
    const stage = stageRef.current;
    if (!fit || !stage) return;
    const apply = () => {
      const r = fit.getBoundingClientRect();
      if (!r.width || !r.height) return;
      stage.style.setProperty("--c2-scale", String(Math.min(r.width / W, r.height / H)));
    };
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(fit);
    return () => ro.disconnect();
  }, []);

  // Run only while the card is on screen, and never for reduced-motion users —
  // they get frame B at rest, which is what the original artwork showed.
  useEffect(() => {
    const el = fitRef.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      // Deferred rather than set straight from the effect body: the phase is
      // React state, and setting it synchronously here trips the
      // cascading-render rule (same pattern as the auto-convert effect).
      const t = setTimeout(() => setPhase("checking"), 0);
      return () => clearTimeout(t);
    }

    const clear = () => {
      timers.current.forEach(clearTimeout);
      timers.current = [];
    };

    const run = () => {
      clear();
      for (const step of STEPS) {
        timers.current.push(
          setTimeout(() => {
            setPhase(step.phase);
            if (step.press) {
              setPress(step.press);
              timers.current.push(setTimeout(() => setPress(null), PRESS_MS));
            }
          }, step.at)
        );
      }
      timers.current.push(setTimeout(run, LOOP_MS));
    };

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) run();
        else {
          clear();
          setPhase("idle");
          setPress(null);
        }
      },
      { threshold: 0.35 }
    );
    io.observe(el);
    return () => {
      clear();
      io.disconnect();
    };
  }, []);

  const r = rank(phase);
  const onSecondTab = r >= rank("browse") && phase !== "reset";
  const hasUrl = r >= rank("paste") && phase !== "reset";
  const showStatus = r >= rank("checking") && phase !== "reset";
  const spinning = phase === "checking" || phase === "converting";
  const statusIndex =
    phase === "converting" ? 1 : phase === "converted" ? 2 : 0;

  return (
    <div className="mktg-card-illus">
      <div className="c2-fit" ref={fitRef}>
        <div
          className={`c2-stage${onSecondTab ? " is-tab2" : ""}`}
          ref={stageRef}
          aria-hidden
        >
          {/* ── Browser chrome: shared by both frames, so the tab change reads
              as one window rather than a cut between two pictures. ── */}
          <div className="c2-bar">
            <div className="c2-lights">
              <span className="c2-light c2-light--close" />
              <span className="c2-light c2-light--min" />
              <span className="c2-light c2-light--max" />
            </div>

            <div className="c2-urlgroup">
              {/* The Framer tab collapses to a favicon when the second tab opens. */}
              <span className="c2-fav">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/illustrations/card02/tab-favicon.png" alt="" />
              </span>

              <span className="c2-addr">
                <span className="c2-addr-text c2-addr-text--a">
                  <span className="c2-sel">clearmeaj.framer.website</span>
                </span>
                <span className="c2-addr-text c2-addr-text--b">framertonextjs.com</span>
              </span>

              <span className="c2-divider" />

              <span className={`c2-plus${press === "plus" ? " is-pressed" : ""}`}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path
                    d="M6.99479 2.33203V11.6654M11.6615 6.9987H2.32812"
                    stroke="#767676"
                    strokeWidth="0.875"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
            </div>

            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="c2-brave" src="/illustrations/card02/brave.svg" alt="Browser window icon" />
          </div>

          {/* ── Frame A: the published Framer site with the Copy link tip ── */}
          <div className="c2-frame c2-frame--a">
            <div className={`c2-tip${press === "copy" ? " is-pressed" : ""}`}>
              <span className="c2-tip-arrow" />
              <span className="c2-tip-pill">Copy link</span>
            </div>

            <div className="c2-skel">
              <div className="c2-skel-screens">
                <div className="c2-skel-boxes">
                  <span className="c2-skel-box c2-skel-box--1" />
                  <span className="c2-skel-box c2-skel-box--2" />
                  <span className="c2-skel-box c2-skel-box--3" />
                </div>
                <span className="c2-skel-box c2-skel-score" />
              </div>
              <span className="c2-skel-box c2-skel-image" />
            </div>
          </div>

          {/* ── Frame B: framertonextjs.com, where the conversion happens ── */}
          <div className="c2-frame c2-frame--b">
            <div className="c2-toggleblock">
              <span className="c2-rule" />
              <span className="c2-toggle">
                <span className="c2-tab is-on">Convert to Next.js</span>
                <span className="c2-tab">Improve Site Performance</span>
              </span>
              <span className="c2-rule" />
            </div>

            <div className="c2-conv">
              <span className={`c2-input${phase === "paste" ? " is-pasting" : ""}`}>
                {/* Kept in flow at all times so the button never shifts when
                    the URL arrives — only its paint changes. */}
                <span className={`c2-input-url${hasUrl ? " is-filled" : ""}`}>
                  clearmeaj.framer.website
                </span>
                <span className={`c2-cta${press === "cta" ? " is-pressed" : ""}`}>
                  Get Next.js file
                </span>
              </span>

              <span className={`c2-status${showStatus ? " is-shown" : ""}`}>
                <span className={`c2-status-mark${phase === "converted" ? " is-done" : ""}`}>
                  <span className={`c2-status-spin${spinning ? " is-spinning" : ""}`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src="/illustrations/card02/fnj-mark.svg" alt="" />
                  </span>
                </span>
                <span className="c2-status-text">
                  {STATUS_LABELS.map((label, i) => (
                    <span
                      key={label}
                      className={`c2-status-label${
                        i === statusIndex ? " is-current" : i < statusIndex ? " is-past" : ""
                      }`}
                    >
                      {label}
                    </span>
                  ))}
                </span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
