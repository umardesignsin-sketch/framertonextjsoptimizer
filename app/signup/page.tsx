"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function SignupPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit() {
    if (!email.trim() || password.length < 8 || busy) return;
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password, name: name.trim() }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Sign up failed");

      const signInRes = await signIn("credentials", { email: email.trim(), password, redirect: false });
      if (signInRes?.error) throw new Error("Account created — please log in");

      router.push("/dashboard");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Sign up failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-5">
      <h1 className="text-2xl font-semibold">Create an account</h1>
      <div className="mt-6 space-y-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Name (optional)"
          className="h-11 w-full rounded-lg border border-border-strong bg-background px-3.5 text-[15px] outline-none focus:border-foreground"
        />
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
          placeholder="Password (min. 8 characters)"
          className="h-11 w-full rounded-lg border border-border-strong bg-background px-3.5 text-[15px] outline-none focus:border-foreground"
        />
        <button
          onClick={submit}
          disabled={busy || !email.trim() || password.length < 8}
          className="h-11 w-full rounded-lg bg-foreground text-[15px] font-medium text-background hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {busy ? "Creating…" : "Sign up"}
        </button>
      </div>
      {error && <p className="mt-3 text-[13px] text-red-600">{error}</p>}
      <p className="mt-4 text-[13px] text-muted-foreground">
        Already have an account? <Link href="/login" className="underline">Log in</Link>
      </p>
    </div>
  );
}
