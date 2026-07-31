import "./theme/tokens.css";
import "./theme/legacy-tokens.css";
import "./theme/components.css";
import "./theme/dashboard.css";
import { IconSprite } from "./theme/IconSprite";

// Scoped to the /dashboard route segment only — these styles never load on
// marketing/login/admin pages, which keep using globals.css + Tailwind.
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <IconSprite />
      {children}
    </>
  );
}
