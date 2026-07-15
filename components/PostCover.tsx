// Deterministic gradient cover for posts without a coverImage — same post
// always gets the same cover, so cards feel designed rather than blank.
function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

const PALETTES: [string, string][] = [
  ["#0b0b0c", "#1f2937"], // near-black -> slate
  ["#111827", "#312e81"], // slate -> indigo
  ["#0b0b0c", "#7c2d12"], // near-black -> burnt orange
  ["#111827", "#164e63"], // slate -> teal
  ["#0b0b0c", "#3730a3"], // near-black -> indigo
  ["#1e1b4b", "#0b0b0c"], // indigo -> near-black
];

export function coverStyle(seed: string): React.CSSProperties {
  const h = hash(seed);
  const [c1, c2] = PALETTES[h % PALETTES.length];
  const angle = 100 + (h % 60);
  return {
    backgroundImage: `radial-gradient(circle at ${20 + (h % 60)}% ${10 + (h % 40)}%, ${c2}, transparent 60%), linear-gradient(${angle}deg, ${c1}, #0b0b0c)`,
  };
}

/** Used as a post card / hero cover when no coverImage is set. */
export function PostCover({ seed, className }: { seed: string; className?: string }) {
  return (
    <div className={className} style={coverStyle(seed)}>
      <div
        aria-hidden
        className="h-full w-full opacity-[0.07]"
        style={{
          backgroundImage:
            "linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)",
          backgroundSize: "28px 28px",
        }}
      />
    </div>
  );
}
