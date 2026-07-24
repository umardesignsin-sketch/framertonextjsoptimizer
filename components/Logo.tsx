// Brand mark: a three-blade pinwheel/swirl inside a rounded triangular
// silhouette, built from one petal path reused 3× via rotation (120° apart)
// so the three blades are perfectly symmetric. Colored with the site's own
// --accent / --accent-hover tokens (not a new hardcoded blue) so the mark
// stays consistent with every existing CTA and highlight on the site.
export function Logo({
  size = 24,
  className,
  spinning = false,
}: {
  size?: number;
  className?: string;
  /** Slow continuous rotation — used for the editor's loading state. */
  spinning?: boolean;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      className={`${className || ""} ${spinning ? "animate-[spin_1.4s_linear_infinite]" : ""}`}
      aria-hidden
    >
      <defs>
        <linearGradient id="logo-blade" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="var(--accent, #4f46e5)" />
          <stop offset="100%" stopColor="var(--accent-hover, #4338ca)" />
        </linearGradient>
        <path
          id="logo-petal"
          d="M100,100 C93,50 55,22 100,6 C148,20 110,53 100,100 Z"
        />
      </defs>
      <use href="#logo-petal" fill="url(#logo-blade)" />
      <use href="#logo-petal" fill="url(#logo-blade)" transform="rotate(120 100 100)" />
      <use href="#logo-petal" fill="url(#logo-blade)" transform="rotate(240 100 100)" />
      <circle cx="100" cy="100" r="17" fill="#ffffff" />
    </svg>
  );
}
