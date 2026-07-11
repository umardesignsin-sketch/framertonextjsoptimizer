"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { createSupabaseBrowser } from "@/lib/supabase/client";
import { GoogleAuthButton } from "@/components/GoogleAuthButton";
import { EmailOtpForm } from "@/components/EmailOtpForm";

function LoginForm() {
  const params = useSearchParams();
  const next = params.get("next") || "/dashboard";
  // OTP is enabled once a custom SMTP provider is configured (branded code
  // email). Until then, password + Google are the working methods.
  const otpEnabled = process.env.NEXT_PUBLIC_EMAIL_OTP === "1";
  const [method, setMethod] = useState<"code" | "password">(otpEnabled ? "code" : "password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(params.get("error") || "");

  async function submit() {
    if (!email.trim() || !password || busy) return;
    setBusy(true);
    setError("");
    try {
      const supabase = createSupabaseBrowser();
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) throw new Error(error.message);
      // Full navigation so the server immediately sees the new session cookie.
      window.location.assign(params.get("next") || "/dashboard");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-5">
      <h1 className="text-2xl font-semibold">Log in</h1>

      <div className="mt-6">
        <GoogleAuthButton next={next} label="Log in with Google" />
      </div>
      <div className="my-5 flex items-center gap-3 text-[12px] text-muted-foreground">
        <span className="h-px flex-1 bg-border" />
        or
        <span className="h-px flex-1 bg-border" />
      </div>

      {method === "code" ? (
        <EmailOtpForm next={next} cta="Email me a login code" />
      ) : (
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
            placeholder="Password"
            className="h-11 w-full rounded-lg border border-border-strong bg-background px-3.5 text-[15px] outline-none focus:border-foreground"
          />
          <button
            onClick={submit}
            disabled={busy || !email.trim() || !password}
            className="h-11 w-full rounded-lg bg-foreground text-[15px] font-medium text-background hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {busy ? "Logging in…" : "Log in"}
          </button>
          {error && <p className="text-[13px] text-red-600">{error}</p>}
        </div>
      )}

      {otpEnabled && (
        <button
          onClick={() => { setMethod((m) => (m === "code" ? "password" : "code")); setError(""); }}
          className="mt-3 text-[13px] text-muted-foreground underline"
        >
          {method === "code" ? "Use a password instead" : "Email me a one-time code instead"}
        </button>
      )}

      <p className="mt-4 text-[13px] text-muted-foreground">
        No account?{" "}
        <Link href={`/signup${params.get("next") ? `?next=${params.get("next")}` : ""}`} className="underline">
          Sign up
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
