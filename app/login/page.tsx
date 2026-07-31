"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { createSupabaseBrowser } from "@/lib/supabase/client";
import { GoogleAuthButton } from "@/components/GoogleAuthButton";
import { EmailOtpForm } from "@/components/EmailOtpForm";
import { Icon } from "@/app/dashboard/theme/Icon";

// Supabase's password-recovery email links back here with a session already
// exchanged from the URL fragment (detectSessionInUrl, on by default) and
// fires this event — that's the real signal to show the "set a new
// password" form instead of the normal login form.
function useRecoveryMode() {
  const [recovery, setRecovery] = useState(false);
  useEffect(() => {
    const supabase = createSupabaseBrowser();
    const { data } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") setRecovery(true);
    });
    return () => data.subscription.unsubscribe();
  }, []);
  return recovery;
}

function ResetPasswordForm() {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  async function submit() {
    if (password.length < 6 || busy) return;
    setBusy(true);
    setError("");
    try {
      const supabase = createSupabaseBrowser();
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw new Error(error.message);
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not update password");
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <main className="auth-shell">
        <header className="auth-topbar">
          <Link className="brand" href="/" aria-label="FramerToNextJS home">
            <span className="brand-mark" aria-hidden="true"><i></i><i></i><i></i></span>
            <span>FramerToNextJS</span>
          </Link>
        </header>
        <section className="auth-card" aria-live="polite">
          <div className="auth-copy">
            <p className="eyebrow">Password updated</p>
            <h1>You&rsquo;re all set.</h1>
            <p>Your password has been changed. Continue to your dashboard.</p>
          </div>
          <Link className="primary-button" href="/dashboard">
            <span>Go to dashboard</span>
            <Icon name="arrow-right" className="icon icon-sm" />
          </Link>
        </section>
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
      </header>
      <section className="auth-card" aria-live="polite">
        <div className="auth-copy">
          <p className="eyebrow">Reset password</p>
          <h1>Create a new password.</h1>
          <p>Choose a new password to regain access to your workspace.</p>
        </div>
        <div className="auth-form">
          <div className="field-row" data-field="newPassword">
            <label htmlFor="new-password">New password</label>
            <input
              id="new-password"
              type="password"
              autoComplete="new-password"
              placeholder="Use at least 6 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
            />
          </div>
          {error && <p className="global-error">{error}</p>}
          <button className="primary-button" type="button" disabled={busy || password.length < 6} onClick={submit}>
            <span>{busy ? "Saving…" : "Reset password"}</span>
            <Icon name="arrow-right" className="icon icon-sm" />
          </button>
        </div>
      </section>
    </main>
  );
}

function LoginForm() {
  const params = useSearchParams();
  const next = params.get("next") || "/dashboard";
  // OTP is enabled once a custom SMTP provider is configured (branded code
  // email). When on, login is via the emailed code or Google — no password
  // bypass. Existing password accounts still work: OTP authenticates the
  // same Supabase user by email. The password path only exists as a
  // fallback for when OTP isn't configured.
  const otpEnabled = process.env.NEXT_PUBLIC_EMAIL_OTP === "1";
  const inRecovery = useRecoveryMode();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(params.get("error") || "");
  const [forgotSent, setForgotSent] = useState(false);

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

  async function forgotPassword() {
    if (!email.trim() || busy) return;
    setBusy(true);
    setError("");
    try {
      const supabase = createSupabaseBrowser();
      const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo: `${window.location.origin}/login`,
      });
      if (error) throw new Error(error.message);
      setForgotSent(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not send reset link");
    } finally {
      setBusy(false);
    }
  }

  const signupHref = `/signup${params.get("next") ? `?next=${params.get("next")}` : ""}`;

  if (inRecovery) return <ResetPasswordForm />;

  return (
    <main className="auth-shell">
      <header className="auth-topbar">
        <Link className="brand" href="/" aria-label="FramerToNextJS home">
          <span className="brand-mark" aria-hidden="true"><i></i><i></i><i></i></span>
          <span>FramerToNextJS</span>
        </Link>
        <Link className="quiet-link" href={signupHref}>Create account</Link>
      </header>

      <section className="auth-card" aria-live="polite">
        <div className="auth-copy">
          <p className="eyebrow">Welcome back</p>
          <h1>Sign in to your workspace.</h1>
          <p>Continue conversions, download completed projects, and manage deployments.</p>
        </div>

        <div className="auth-form">
          <GoogleAuthButton next={next} label="Log in with Google" />

          <div className="auth-divider" role="separator">
            <span>or</span>
          </div>

          {otpEnabled ? (
            // OTP mandatory: no password bypass on login — same guarantee as
            // signup. Existing password accounts still log in fine via OTP,
            // since Supabase matches by email.
            <EmailOtpForm next={next} cta="Email me a login code" />
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
                <div className="label-line">
                  <label htmlFor="password">Password</label>
                  <button type="button" className="text-link" onClick={forgotPassword} disabled={busy || !email.trim()}>
                    Forgot?
                  </button>
                </div>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="Enter password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && submit()}
                />
              </div>

              {forgotSent && (
                <p className="muted-copy">
                  If an account exists for {email.trim()}, a reset link has been sent.
                </p>
              )}

              {error && <p className="global-error">{error}</p>}

              <button
                className="primary-button"
                type="button"
                disabled={busy || !email.trim() || !password}
                onClick={submit}
              >
                <span>{busy ? "Signing in…" : "Sign in"}</span>
                <Icon name="arrow-right" className="icon icon-sm" />
              </button>
            </>
          )}
        </div>

        <footer className="auth-footer">
          <span>New to FramerToNextJS?</span>
          <Link href={signupHref}>Create account</Link>
        </footer>
      </section>

      <p className="security-note">
        Protected by email verification. We only ask for what is needed to keep your projects accessible.
      </p>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
