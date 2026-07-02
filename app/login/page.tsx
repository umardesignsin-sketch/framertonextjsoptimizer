"use client";

import { useState, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    if (!email.trim() || !password || busy) return;
    setBusy(true);
    setError("");
    try {
      const res = await signIn("credentials", {
        email: email.trim(),
        password,
        redirect: false,
      });
      if (res?.error) throw new Error("Invalid email or password");
      router.push(params.get("next") || "/dashboard");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Login failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-5">
      <h1 className="text-2xl font-semibold">Log in</h1>
      <div className="mt-6 space-y-2">
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
      </div>
      {error && <p className="mt-3 text-[13px] text-red-600">{error}</p>}
      <p className="mt-4 text-[13px] text-muted-foreground">
        No account? <Link href="/signup" className="underline">Sign up</Link>
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
