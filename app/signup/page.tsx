"use client";

import { useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { createSupabaseBrowser } from "@/lib/supabase/client";
import { GoogleAuthButton } from "@/components/GoogleAuthButton";
import { EmailOtpForm } from "@/components/EmailOtpForm";
import { Icon } from "@/app/dashboard/theme/Icon";

function SignupForm() {
  const params = useSearchParams();
  const next = params.get("next") || "/dashboard";
  // OTP is enabled once a custom SMTP provider is configured (branded code
  // email). When on, signup REQUIRES the emailed code or Google — no
  // password bypass, so every account is verified by construction. The
  // password path only exists as a fallback for when OTP isn't configured.
  const otpEnabled = process.env.NEXT_PUBLIC_EMAIL_OTP === "1";
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

  const loginHref = `/login${params.get("next") ? `?next=${params.get("next")}` : ""}`;

  if (check) {
    return (
      <main className="auth-shell">
        <header className="auth-topbar">
          <Link className="brand" href="/" aria-label="FramerToNextJS home">
            <span className="brand-mark" aria-hidden="true"><i></i><i></i><i></i></span>
            <span>FramerToNextJS</span>
          </Link>
          <Link className="quiet-link" href={loginHref}>Sign in</Link>
        </header>

        <section className="auth-card" aria-live="polite">
          <div className="auth-copy">
            <p className="eyebrow">Verify email</p>
            <h1>Check your inbox.</h1>
            <p>We sent a confirmation link to {email}. Click it, then sign in.</p>
          </div>
        </section>

        <p className="security-note">
          Protected by email verification. We only ask for what is needed to keep your projects accessible.
        </p>
      </main>
    );
  }

  return (
    <main className="auth-shell">
      <header className="auth-topbar">
        <Link className="brand" href="/" aria-label="FramerToNextJS home">
          <span className="brand-mark" aria-hidden="true"><i></i><i></i><i></i></span>
          <span>FramerToNextJS</span>
        </Link>
        <Link className="quiet-link" href={loginHref}>Sign in</Link>
      </header>

      <section className="auth-card" aria-live="polite">
        <div className="auth-copy">
          <p className="eyebrow">Create workspace</p>
          <h1>Start converting Framer sites.</h1>
          <p>Create an account to save projects, download exports, and deploy when you are ready.</p>
        </div>

        <div className="auth-form">
          <GoogleAuthButton next={next} label="Sign up with Google" />

          <div className="auth-divider" role="separator">
            <span>or</span>
          </div>

          {otpEnabled ? (
            // OTP mandatory: no password bypass on signup — every account is
            // verified by construction (Google or a real emailed code).
            <EmailOtpForm next={next} cta="Email me a verification code" />
          ) : (
            <>
              <div className="field-row" data-field="email">
                <label htmlFor="email">Email</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div className="field-row" data-field="password">
                <label htmlFor="password">Password</label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  placeholder="Password (min. 6 characters)"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && submit()}
                />
              </div>

              <div className="notice form-note">
                <span>i</span>
                <p>No card required. Your workspace is created after email verification.</p>
              </div>

              {error && <p className="global-error">{error}</p>}

              <button
                className="primary-button"
                type="button"
                disabled={busy || !email.trim() || password.length < 6}
                onClick={submit}
              >
                <span>{busy ? "Creating…" : "Create account"}</span>
                <Icon name="arrow-right" className="icon icon-sm" />
              </button>
            </>
          )}
        </div>

        <footer className="auth-footer">
          <span>Already have an account?</span>
          <Link href={loginHref}>Sign in</Link>
        </footer>
      </section>

      <p className="security-note">
        Protected by email verification. We only ask for what is needed to keep your projects accessible.
      </p>
    </main>
  );
}

export default function SignupPage() {
  return (
    <Suspense>
      <SignupForm />
    </Suspense>
  );
}
