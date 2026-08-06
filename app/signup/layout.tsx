import type { Metadata } from "next";
import "@/app/dashboard/theme/tokens.css";
import "@/app/dashboard/theme/legacy-tokens.css";
import "@/app/dashboard/theme/components.css";
import "@/app/dashboard/theme/auth.css";
import { IconSprite } from "@/app/dashboard/theme/IconSprite";

// Auth surface — never index.
export const metadata: Metadata = {
  title: "Sign up",
  robots: { index: false, follow: false },
};

export default function SignupLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <>
      <IconSprite />
      {children}
    </>
  );
}
