"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowser } from "@/lib/supabase/client";

export type AuthState = "loading" | "in" | "out";

/** Tracks the current Supabase auth session client-side. */
export function useAuthUser(): AuthState {
  const [state, setState] = useState<AuthState>("loading");

  useEffect(() => {
    const supabase = createSupabaseBrowser();
    supabase.auth.getUser().then(({ data }) => setState(data.user ? "in" : "out"));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) =>
      setState(session?.user ? "in" : "out")
    );
    return () => sub.subscription.unsubscribe();
  }, []);

  return state;
}
