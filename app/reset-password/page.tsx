"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Lock, Loader2, CheckCircle2 } from "lucide-react";
import { Suspense } from "react";

function ResetPasswordForm() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    if (!token) {
      setError("This reset link is missing a token. Request a new one.");
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });

      setLoading(false);

      if (!res.ok) {
        const data = await res.json();
        setError(data.message || "Could not reset your password.");
        return;
      }

      setDone(true);
    } catch {
      setLoading(false);
      setError("Something went wrong. Please try again.");
    }
  };

  if (done) {
    return (
      <div className="mt-6 flex flex-col items-start gap-3 rounded-sheet border border-emerald-500/20 bg-emerald-500/10 p-4">
        <CheckCircle2 className="h-6 w-6 text-emerald-400" />
        <p className="text-sm text-content">
          Your password has been updated. You can now sign in.
        </p>
        <Link href="/login" className="text-sm font-bold text-red-400 hover:underline">
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-4">
      <div className="relative">
        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-content-subtle" />
        <label htmlFor="reset-password" className="sr-only">
          New password
        </label>
        <input
          id="reset-password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="New password"
          required
          minLength={8}
          autoComplete="new-password"
          className="kin-input kin-input-ink kin-input-affix py-3.5"
        />
      </div>

      <div className="relative">
        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-content-subtle" />
        <label htmlFor="reset-password-confirm" className="sr-only">
          Confirm new password
        </label>
        <input
          id="reset-password-confirm"
          type="password"
          value={confirm}
          onChange={(event) => setConfirm(event.target.value)}
          placeholder="Confirm new password"
          required
          minLength={8}
          autoComplete="new-password"
          className="kin-input kin-input-ink kin-input-affix py-3.5"
        />
      </div>

      {error && (
        <p className="text-xs text-red-300 bg-accent-hover/10 border border-accent/20 rounded-sheet px-3 py-2">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-accent hover:bg-accent-hover disabled:opacity-70 text-on-accent font-semibold text-sm py-3.5 rounded-control flex items-center justify-center gap-2 transition"
      >
        {loading && <Loader2 className="h-4 w-4 animate-spin" />}
        Set new password
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas p-6 text-content">
      <div className="w-full max-w-md rounded-overlay border border-rule bg-surface-raised/50 p-8">
        <h1 className="font-display text-2xl font-medium leading-tight text-content">Choose a new password</h1>
        <p className="mt-2 text-sm text-content-muted">Enter and confirm your new password below.</p>
        <Suspense fallback={null}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}