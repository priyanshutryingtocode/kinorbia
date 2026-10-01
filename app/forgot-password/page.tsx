"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { Mail, Loader2, CheckCircle2, ArrowLeft } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      setLoading(false);

      if (!res.ok) {
        const data = await res.json();
        setError(data.message || "Something went wrong.");
        return;
      }

      setSent(true);
    } catch {
      setLoading(false);
      setError("Something went wrong. Please try again.");
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas p-6 text-content">
      <div className="w-full max-w-md rounded-overlay border border-rule bg-surface-raised/50 p-8">
        <Link
          href="/login"
          className="mb-6 inline-flex items-center gap-2 text-sm text-content-muted transition hover:text-content"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to sign in
        </Link>

        <h1 className="text-2xl font-bold">Reset your password</h1>
        <p className="mt-2 text-sm text-content-muted">
          Enter your email and we&apos;ll send you a link to set a new password.
        </p>

        {sent ? (
          <div className="mt-6 flex flex-col items-start gap-3 rounded-sheet border border-emerald-500/20 bg-emerald-500/10 p-4">
            <CheckCircle2 className="h-6 w-6 text-emerald-400" />
            <p className="text-sm text-content">
              If an account exists for that email, a reset link has been sent. Check your inbox.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-content-subtle" />
              <label htmlFor="forgot-email" className="sr-only">
                Email address
              </label>
              <input
                id="forgot-email"
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Email address"
                required
                autoComplete="email"
                className="kin-input kin-input-affix py-3.5"
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
              Send reset link
            </button>
          </form>
        )}

        <p className="mt-6 text-xs text-content-subtle">
          Remembered it?{" "}
          <Link href="/login" className="text-red-400 font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}