import type { Metadata } from "next";

// Auth surface — never index.
export const metadata: Metadata = {
  title: "Log in",
  robots: { index: false, follow: false },
};

export default function LoginLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
