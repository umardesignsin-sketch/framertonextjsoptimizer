// Deterministic, on-brand generative cover art for blog posts. The same slug
// always renders the same cover, so cards feel designed rather than blank —
// vibrant layered SVG compositions (not flat placeholders), fully
// server-rendered with no external images, so they never 404 and scale to
// infinite posts for free. Four motifs × several palettes, seeded by slug.
import type { ReactNode } from "react";

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

// Small seeded PRNG so element placement varies per post but stays stable.
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Vibrant, brand-aligned palettes (indigo/violet lead, with cool + warm
// variations). Each: two-stop background gradient (a→b) + two shape colors.
const PALETTES: { a: string; b: string; s1: string; s2: string }[] = [
  { a: "#4f46e5", b: "#7c3aed", s1: "#a78bfa", s2: "#c4b5fd" }, // indigo → violet
  { a: "#2563eb", b: "#0891b2", s1: "#38bdf8", s2: "#67e8f9" }, // blue → cyan
  { a: "#7c3aed", b: "#c026d3", s1: "#e879f9", s2: "#f0abfc" }, // violet → fuchsia
  { a: "#0d9488", b: "#059669", s1: "#5eead4", s2: "#6ee7b7" }, // teal → emerald
  { a: "#4338ca", b: "#1e3a8a", s1: "#818cf8", s2: "#93c5fd" }, // indigo → blue
  { a: "#db2777", b: "#e11d48", s1: "#fb7185", s2: "#fda4af" }, // rose → pink
  { a: "#ea580c", b: "#d97706", s1: "#fdba74", s2: "#fcd34d" }, // orange → amber
];

function buildShapes(motif: number, pal: (typeof PALETTES)[number], rnd: () => number, uid: string): ReactNode[] {
  const shapes: ReactNode[] = [];
  const r = () => rnd();

  if (motif === 0) {
    // Orbits — concentric rings + a bold accent disc.
    const cx = 50 + r() * 130;
    const cy = 30 + r() * 140;
    for (let i = 1; i <= 5; i++) {
      shapes.push(
        <circle key={`o${i}`} cx={cx} cy={cy} r={i * 40} fill="none" stroke={pal.s1} strokeWidth={2} opacity={0.28} />
      );
    }
    shapes.push(
      <circle key="od" cx={290 + r() * 70} cy={210 + r() * 50} r={38 + r() * 34} fill={pal.s2} opacity={0.92} />
    );
  } else if (motif === 1) {
    // Field — a large soft disc + a scatter of accent nodes over a dot grid.
    shapes.push(<circle key="d" cx={290} cy={70} r={120} fill={pal.s1} opacity={0.22} />);
    const dots: ReactNode[] = [];
    for (let x = 20; x < 400; x += 34) {
      for (let y = 20; y < 300; y += 34) {
        dots.push(<circle key={`g${x}-${y}`} cx={x} cy={y} r={2} fill="#ffffff" opacity={0.16} />);
      }
    }
    shapes.push(<g key="dots">{dots}</g>);
    for (let i = 0; i < 4; i++) {
      shapes.push(
        <circle key={`n${i}`} cx={40 + r() * 320} cy={40 + r() * 220} r={5 + r() * 6} fill={pal.s2} opacity={0.95} />
      );
    }
  } else if (motif === 2) {
    // Bands — overlapping rounded diagonal bars.
    for (let i = 0; i < 4; i++) {
      const y = -30 + i * 68 + r() * 24;
      shapes.push(
        <rect
          key={`b${i}`}
          x={-60}
          y={y}
          width={520}
          height={34}
          rx={17}
          fill={i % 2 ? pal.s1 : pal.s2}
          opacity={0.2 + 0.14 * i}
          transform="rotate(-20 200 150)"
        />
      );
    }
  } else {
    // Mesh — big soft blurred blobs.
    shapes.push(
      <g key="mesh" filter={`url(#${uid}-blur)`}>
        <circle cx={40 + r() * 320} cy={30 + r() * 240} r={130} fill={pal.s1} opacity={0.75} />
        <circle cx={40 + r() * 320} cy={30 + r() * 240} r={110} fill={pal.s2} opacity={0.6} />
        <circle cx={40 + r() * 320} cy={30 + r() * 240} r={95} fill={pal.b} opacity={0.6} />
      </g>
    );
  }
  return shapes;
}

/** Blog card / hero cover — designed generative art keyed on the post slug. */
export function PostCover({ seed, className }: { seed: string; className?: string }) {
  const h = hash(seed);
  const pal = PALETTES[h % PALETTES.length];
  const motif = h % 4;
  const rnd = mulberry32(h);
  const uid = `pc-${(h % 1000000).toString(36)}`;

  // Faint unifying grid, tying every motif into one visual family.
  const grid: ReactNode[] = [];
  for (let x = 40; x < 400; x += 40) grid.push(<line key={`vx${x}`} x1={x} y1={0} x2={x} y2={300} />);
  for (let y = 40; y < 300; y += 40) grid.push(<line key={`hy${y}`} x1={0} y1={y} x2={400} y2={y} />);

  return (
    <div className={className} aria-hidden style={{ overflow: "hidden" }}>
      <svg viewBox="0 0 400 300" preserveAspectRatio="xMidYMid slice" className="h-full w-full">
        <defs>
          <linearGradient id={`${uid}-bg`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor={pal.a} />
            <stop offset="1" stopColor={pal.b} />
          </linearGradient>
          <filter id={`${uid}-blur`} x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation={28} />
          </filter>
        </defs>
        <rect width={400} height={300} fill={`url(#${uid}-bg)`} />
        {buildShapes(motif, pal, rnd, uid)}
        <g stroke="#ffffff" strokeWidth={1} opacity={0.08}>
          {grid}
        </g>
      </svg>
    </div>
  );
}
