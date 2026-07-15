import type { Metadata } from "next";

// Auth surface — never index.
export const metadata: Metadata = {
  title: "Sign up",
  robots: { index: false, follow: false },
};

export default function SignupLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
