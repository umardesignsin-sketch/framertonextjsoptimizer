"use client";

import { useSession } from "next-auth/react";

export function AuthNavLink() {
  const { data: session, status } = useSession();

  if (status === "loading") return null;

  return (
    <a
      href={session ? "/dashboard" : "/login"}
      className="text-muted-foreground hover:text-foreground"
    >
      {session ? "Dashboard" : "Log in"}
    </a>
  );
}
