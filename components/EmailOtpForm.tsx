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

  if (step === "code") {
    return (
      <>
        {info && <p className="muted-copy">{info}</p>}
        <div className="field-row">
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 10))}
            onKeyDown={(e) => e.key === "Enter" && verify()}
            inputMode="numeric"
            autoComplete="one-time-code"
            placeholder="Code from your email"
            style={{ textAlign: "center", letterSpacing: "0.3em" }}
            autoFocus
          />
        </div>
        {error && <p className="global-error">{error}</p>}
        <button className="primary-button" type="button" onClick={verify} disabled={busy || code.trim().length < 6}>
          <span>{busy ? "Verifying…" : "Verify & continue"}</span>
        </button>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "12px" }}>
          <button
            type="button"
            className="text-link"
            onClick={() => { setStep("email"); setCode(""); setError(""); }}
          >
            Use a different email
          </button>
          <button type="button" className="text-link" onClick={sendCode} disabled={busy}>
            Resend code
          </button>
        </div>
      </>
    );
  }

  return (
    <>
      <div className="field-row">
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendCode()}
          type="email"
          placeholder="you@example.com"
          autoFocus
        />
      </div>
      {error && <p className="global-error">{error}</p>}
      <button className="primary-button" type="button" onClick={sendCode} disabled={busy || !email.trim()}>
        <span>{busy ? "Sending…" : cta}</span>
      </button>
    </>
  );
}
