import type { Metadata } from "next";
import "@/app/dashboard/theme/tokens.css";
import "@/app/dashboard/theme/legacy-tokens.css";
import "@/app/dashboard/theme/components.css";
import "@/app/dashboard/theme/project.css";
import { IconSprite } from "@/app/dashboard/theme/IconSprite";

// Auth surface — never index.
export const metadata: Metadata = {
  title: "Project",
  robots: { index: false, follow: false },
};

export default function ProjectLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <IconSprite />
      {children}
    </>
  );
}
