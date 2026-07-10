"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { createSupabaseBrowser } from "@/lib/supabase/client";
import { GoogleAuthButton } from "@/components/GoogleAuthButton";

function SignupForm() {
  const params = useSearchParams();
  const next = params.get("next") || "/dashboard";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [check, setCheck] = useState(false);

  async function submit() {
    if (!email.trim() || password.length < 6 || busy) return;
    setBusy(true);
    setError("");
    try {
      const supabase = createSupabaseBrowser();
      const { data, error } = await supabase.auth.signUp({ email: email.trim(), password });
      if (error) throw new Error(error.message);
      if (!data.session) {
        setCheck(true); // email confirmation required (if autoconfirm ever off)
        return;
      }
      // Full navigation so the server immediately sees the new session cookie.
      window.location.assign(params.get("next") || "/dashboard");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sign up failed");
    } finally {
      setBusy(false);
    }
  }

  if (check) {
    return (
      <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-5">
        <h1 className="text-2xl font-semibold">Check your email</h1>
        <p className="mt-2 text-[14px] text-muted-foreground">
          We sent a confirmation link to {email}. Click it, then{" "}
          <Link href="/login" className="underline">
            log in
          </Link>
          .
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-5">
      <h1 className="text-2xl font-semibold">Create an account</h1>

      <div className="mt-6">
        <GoogleAuthButton next={next} label="Sign up with Google" />
      </div>
      <div className="my-5 flex items-center gap-3 text-[12px] text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        or
        <span className="h-px flex-1 bg-border" />
      </div>

      <div className="space-y-2">
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          placeholder="Email"
          className="h-11 w-full rounded-lg border border-border-strong bg-background px-3.5 text-[15px] outline-none focus:border-foreground"
        />
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
          type="password"
          placeholder="Password (min. 6 characters)"
          className="h-11 w-full rounded-lg border border-border-strong bg-background px-3.5 text-[15px] outline-none focus:border-foreground"
        />
        <button
          onClick={submit}
          disabled={busy || !email.trim() || password.length < 6}
          className="h-11 w-full rounded-lg bg-foreground text-[15px] font-medium text-background hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy ? "Creating…" : "Sign up"}
        </button>
      </div>
      {error && <p className="mt-3 text-[13px] text-red-600">{error}</p>}
      <p className="mt-4 text-[13px] text-muted-foreground">
        Already have an account?{" "}
        <Link href={`/login${params.get("next") ? `?next=${params.get("next")}` : ""}`} className="underline">
          Log in
        </Link>
      </p>
    </div>
  );
}

export default function SignupPage() {
  return (
    <Suspense>
      <SignupForm />
    </Suspense>
  );
}
