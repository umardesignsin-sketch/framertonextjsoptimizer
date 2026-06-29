"use client";

import { useState } from "react";

export default function AdminLogin() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!res.ok) {
        setError((await res.json().catch(() => ({}))).error || "Login failed");
        setBusy(false);
        return;
      }
      const next = new URLSearchParams(window.location.search).get("next") || "/admin";
      window.location.href = next.startsWith("/admin") ? next : "/admin";
    } catch {
      setError("Network error");
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-5">
      <h1 className="text-xl font-semibold">Admin</h1>
      <p className="mt-1 text-[13px] text-muted-foreground">
        Enter the admin password to continue.
      </p>
      <form onSubmit={submit} className="mt-5 flex flex-col gap-3">
        <input
          type="password"
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="h-11 rounded-lg border border-border-strong bg-background px-3.5 text-[15px] outline-none focus:border-foreground"
        />
        <button
          type="submit"
          disabled={busy || !password}
          className="h-11 rounded-lg bg-foreground text-[15px] font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          {busy ? "Signing in…" : "Sign in"}
        </button>
        {error && <p className="text-[13px] text-red-500">{error}</p>}
      </form>
    </div>
  );
}
