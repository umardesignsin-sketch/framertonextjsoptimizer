"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowser } from "@/lib/supabase/client";

export function AuthNavLink() {
  const [state, setState] = useState<"loading" | "in" | "out">("loading");

  useEffect(() => {
    const supabase = createSupabaseBrowser();
    supabase.auth.getUser().then(({ data }) => setState(data.user ? "in" : "out"));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) =>
      setState(session?.user ? "in" : "out")
    );
    return () => sub.subscription.unsubscribe();
  }, []);

  if (state === "loading") return null;
  return (
    <a
      href={state === "in" ? "/dashboard" : "/login"}
      className="text-muted-foreground hover:text-foreground"
    >
      {state === "in" ? "Dashboard" : "Log in"}
    </a>
  );
}
