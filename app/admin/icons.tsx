// Small inline icon set for the admin area — no icon library dependency,
// same stroke-based pattern as the editor's icon set (components/../EditorClient.tsx).
import type { ReactNode } from "react";

const PATHS: Record<string, ReactNode> = {
  grid: (
    <>
      <rect x="3" y="3" width="7" height="7" rx="1.5" />
      <rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" />
      <rect x="14" y="14" width="7" height="7" rx="1.5" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3 20c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5" />
      <path d="M16.5 5.2c1.4.4 2.4 1.7 2.4 3.1 0 1.5-1 2.7-2.4 3.1" />
      <path d="M19.5 14.8c1.8.6 3 2.3 3 4.2" />
    </>
  ),
  pencil: (
    <>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" />
    </>
  ),
  logout: (
    <>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="M16 17l5-5-5-5" />
      <path d="M21 12H9" />
    </>
  ),
  external: (
    <>
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <path d="M15 3h6v6" />
      <path d="M10 14 21 3" />
    </>
  ),
  download: (
    <>
      <path d="M12 3v12" />
      <path d="m7 10 5 5 5-5" />
      <path d="M5 21h14" />
    </>
  ),
  trash: (
    <>
      <path d="M4 7h16" />
      <path d="M6 7v13a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V7" />
      <path d="M9 7V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3" />
      <path d="M10 11v6M14 11v6" />
    </>
  ),
  copy: (
    <>
      <rect x="9" y="9" width="12" height="12" rx="2" />
      <path d="M5 15H4a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1" />
    </>
  ),
  check: <path d="m5 13 4 4L19 7" />,
  totals: (
    <>
      <path d="M4 20V10M12 20V4M20 20v-7" />
    </>
  ),
  spark: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v4l2.5 2.5" />
    </>
  ),
  shield: <path d="M12 3 4.5 6v6c0 4.5 3 7.5 7.5 9 4.5-1.5 7.5-4.5 7.5-9V6z" />,
  compass: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="m15 9-2 6-6 2 2-6z" />
    </>
  ),
  code: (
    <>
      <path d="m9 8-4 4 4 4" />
      <path d="m15 8 4 4-4 4" />
    </>
  ),
};

export function Icon({ name, size = 14, className }: { name: keyof typeof PATHS; size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      {PATHS[name]}
    </svg>
  );
}
