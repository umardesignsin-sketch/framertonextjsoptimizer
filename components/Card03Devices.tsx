"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

/**
 * Card 03 of "See how every conversion works" — the device preview and its
 * Lighthouse scores.
 *
 * Rebuilt from the Figma frames (card-03-a / card-03-b) as real DOM so three
 * things can happen that flat artwork could never do: the toggle highlight
 * tracks the device actually on screen, the swap is a proper transition, and
 * the score rings sweep up from zero. The yellow device artwork is the
 * original Figma export, lifted out of the two full-card SVGs into standalone
 * files so it can be swapped independently of everything drawn around it.
 *
 * Geometry is Figma's: a 299.27 × 305.51 board laid out at exactly those
 * numbers and then scaled to whatever the card gives it, so the values below
 * stay the literal design values.
 */

const W = 299.27;
const H = 305.51;
const SWITCH_MS = 3000;

type Device = "mobile" | "desktop";

const SCORES = [
  { key: "performance", label: "Performance", value: 99 },
  { key: "accessibility", label: "Accessibility", value: 98 },
  { key: "best-practices", label: "Best Practices", value: 100 },
  { key: "seo", label: "SEO", value: 100 },
] as const;

// Ring geometry: Figma draws a 34.4px disc with a ~2.2px green rim, which is
// a stroked circle of r=16.1 once the stroke straddles the path.
const RING_BOX = 34.4;
const RING_R = 16.1;
const RING_W = 2.2;
const RING_C = 2 * Math.PI * RING_R;

function DeviceToggle({ value, onChange }: { value: Device; onChange: (d: Device) => void }) {
  const listRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLSpanElement>(null);
  const initialised = useRef(false);

  // Measure-and-place off the DOM rather than from state, same as ModeToggle —
  // the two labels are different widths (77 vs 88 in Figma), so the highlight
  // can't be a fixed half.
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
    <div className="c3-toggle" role="tablist" aria-label="Preview device" ref={listRef}>
      <span className="c3-toggle-thumb" ref={thumbRef} aria-hidden="true" />
      <button
        type="button"
        role="tab"
        aria-selected={value === "mobile"}
        className={`c3-tab c3-tab--mobile${value === "mobile" ? " is-active" : ""}`}
        onClick={() => onChange("mobile")}
      >
        Mobile
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={value === "desktop"}
        className={`c3-tab c3-tab--desktop${value === "desktop" ? " is-active" : ""}`}
        onClick={() => onChange("desktop")}
      >
        Desktop
      </button>
    </div>
  );
}

function RingScore({
  label,
  value,
  runId,
  delay,
}: {
  label: string;
  value: number;
  runId: number;
  delay: number;
}) {
  const circleRef = useRef<SVGCircleElement>(null);
  const [display, setDisplay] = useState(0);

  // runId changes on every device switch, so the sweep replays each time
  // rather than only on first sight.
  useEffect(() => {
    if (runId === 0) return;
    const circle = circleRef.current;
    if (!circle) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      circle.style.strokeDashoffset = String(RING_C * (1 - value / 100));
      const t = setTimeout(() => setDisplay(value), 0);
      return () => clearTimeout(t);
    }

    let raf = 0;
    const duration = 1000;
    const start = performance.now() + delay;

    const tick = (now: number) => {
      const t = Math.min(Math.max((now - start) / duration, 0), 1);
      const eased = 1 - Math.pow(1 - t, 3);
      circle.style.strokeDashoffset = String(RING_C * (1 - eased * (value / 100)));
      setDisplay(Math.round(eased * value));
      if (now < start + duration) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [runId, value, delay]);

  return (
    <div className="c3-metric">
      <div className="c3-ring-wrap">
        <svg
          className="c3-ring"
          viewBox={`0 0 ${RING_BOX} ${RING_BOX}`}
          aria-hidden="true"
        >
          <circle
            className="c3-ring-track"
            cx={RING_BOX / 2}
            cy={RING_BOX / 2}
            r={RING_R}
            strokeWidth={RING_W}
          />
          <circle
            ref={circleRef}
            className="c3-ring-bar"
            cx={RING_BOX / 2}
            cy={RING_BOX / 2}
            r={RING_R}
            strokeWidth={RING_W}
            style={{ strokeDasharray: RING_C, strokeDashoffset: RING_C }}
          />
        </svg>
        <span className="c3-ring-value">{display}</span>
      </div>
      <span className="c3-metric-label">{label}</span>
    </div>
  );
}

export function Card03Devices() {
  // device and run travel together so a switch always restarts the score sweep.
  const [{ device, run }, setState] = useState<{ device: Device; run: number }>({
    device: "mobile",
    run: 0,
  });

  const fitRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const visibleRef = useRef(false);

  // Built at 299.27 × 305.51 and scaled down to fit; measuring both axes keeps
  // it right even when the card hands it an odd-shaped box.
  useEffect(() => {
    const fit = fitRef.current;
    const stage = stageRef.current;
    if (!fit || !stage) return;
    const apply = () => {
      const r = fit.getBoundingClientRect();
      if (!r.width || !r.height) return;
      stage.style.setProperty("--c3-scale", String(Math.min(r.width / W, r.height / H)));
    };
    apply();
    const ro = new ResizeObserver(apply);
    ro.observe(fit);
    return () => ro.disconnect();
  }, []);

  // Flip every 3s while the card is on screen. Restarted on a manual click so
  // a tap isn't overridden a moment later.
  const startTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setState((s) => ({ device: s.device === "mobile" ? "desktop" : "mobile", run: s.run + 1 }));
    }, SWITCH_MS);
  };

  useEffect(() => {
    const el = fitRef.current;
    if (!el) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          if (visibleRef.current) return;
          visibleRef.current = true;
          // Arm the first sweep, then let the interval drive the rotation.
          setState((s) => ({ ...s, run: s.run + 1 }));
          if (!reduced) startTimer();
        } else {
          visibleRef.current = false;
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
        }
      },
      { threshold: 0.4 }
    );
    io.observe(el);
    return () => {
      io.disconnect();
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  const pick = (d: Device) => {
    setState((s) => (s.device === d ? s : { device: d, run: s.run + 1 }));
    if (visibleRef.current && !window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      startTimer();
    }
  };

  return (
    <div className="mktg-card-illus">
      <div className="c3-fit" ref={fitRef}>
        <div className="c3-stage" ref={stageRef}>
          <div className="c3-icon-col">
            <DeviceToggle value={device} onChange={pick} />

            <div className="c3-devices">
              <span className={`c3-slot${device === "mobile" ? " is-shown" : ""}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  className="c3-device c3-device--phone"
                  src="/illustrations/card03/phone.svg"
                  alt="Mobile phone preview of the converted site"
                  loading="lazy"
                  decoding="async"
                />
              </span>
              <span className={`c3-slot${device === "desktop" ? " is-shown" : ""}`}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  className="c3-device c3-device--laptop"
                  src="/illustrations/card03/laptop.svg"
                  alt="Desktop laptop preview of the converted site"
                  loading="lazy"
                  decoding="async"
                />
              </span>
            </div>
          </div>

          <div className="c3-scores">
            {SCORES.map((s, i) => (
              <RingScore
                key={s.key}
                label={s.label}
                value={s.value}
                runId={run}
                delay={i * 90}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
