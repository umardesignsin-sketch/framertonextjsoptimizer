import type { ReactNode } from "react";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { IconSprite } from "@/app/dashboard/theme/IconSprite";
import "@/app/dashboard/theme/tokens.css";
import "@/app/dashboard/theme/legacy-tokens.css";
import "@/app/dashboard/theme/components.css";
import "./theme/conversion.css";
import "./theme/marketing.css";

// Chrome for the public marketing site only — admin/dashboard/editor/studio
// live outside this route group and inherit just the bare root layout, so
// this nav/footer never leaks onto internal app screens.
export default function MarketingLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <IconSprite />
      <Header />
      {children}
      <Footer />
    </>
  );
}
