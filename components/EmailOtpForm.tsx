"use client";

import { useState } from "react";
import { createSupabaseBrowser } from "@/lib/supabase/client";

// Passwordless email OTP: sends a 6-digit code, then verifies it. Works for
// both new signups and returning users (Supabase creates the user if needed),
// so every account that gets in has a verified email by construction.
export function EmailOtpForm({ next, cta }: { next: string; cta: string }) {
  const [step, setStep] = useState<"email" | "code">("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");

  async function sendCode() {
    const addr = email.trim();
    if (!addr || busy) return;
    setBusy(true);
    setError("");
    setInfo("");
    try {
      const supabase = createSupabaseBrowser();
      const { error } = await supabase.auth.signInWithOtp({
        email: addr,
        options: { shouldCreateUser: true },
      });
      if (error) throw new Error(error.message);
      setStep("code");
      setInfo(`We emailed a 6-digit code to ${addr}. It expires in a few minutes.`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send the code");
    } finally {
      setBusy(false);
    }
  }

  async function verify() {
    const token = code.trim();
    if (token.length < 6 || busy) return;
    setBusy(true);
    setError("");
    try {
      const supabase = createSupabaseBrowser();
      const { error } = await supabase.auth.verifyOtp({ email: email.trim(), token, type: "email" });
      if (error) throw new Error(error.message);
      // Full navigation so the server sees the fresh session cookie.
      window.location.assign(next);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invalid or expired code");
      setBusy(false);
    }
  }

  const input =
    "h-11 w-full rounded-lg border border-border-strong bg-background px-3.5 text-[15px] outline-none focus:border-foreground";
  const button =
    "h-11 w-full rounded-lg bg-foreground text-[15px] font-medium text-background hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40";

  if (step === "code") {
    return (
      <div className="space-y-2">
        {info && <p className="text-[13px] text-muted-foreground">{info}</p>}
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 10))}
          onKeyDown={(e) => e.key === "Enter" && verify()}
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="Code from your email"
          className={`${input} text-center tracking-[0.3em]`}
          autoFocus
        />
        <button onClick={verify} disabled={busy || code.trim().length < 6} className={button}>
          {busy ? "Verifying…" : "Verify & continue"}
        </button>
        {error && <p className="text-[13px] text-red-600">{error}</p>}
        <div className="flex items-center justify-between text-[12.5px] text-muted-foreground">
          <button onClick={() => { setStep("email"); setCode(""); setError(""); }} className="underline">
            Use a different email
          </button>
          <button onClick={sendCode} disabled={busy} className="underline disabled:opacity-50">
            Resend code
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <input
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        onKeyDown={(e) => e.key === "Enter" && sendCode()}
        type="email"
        placeholder="you@example.com"
        className={input}
        autoFocus
      />
      <button onClick={sendCode} disabled={busy || !email.trim()} className={button}>
        {busy ? "Sending…" : cta}
      </button>
      {error && <p className="text-[13px] text-red-600">{error}</p>}
    </div>
  );
}
