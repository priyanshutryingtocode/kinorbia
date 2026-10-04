"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { Mail, CheckCircle2, ArrowLeft } from "lucide-react";
import AuthShell from "@/components/AuthShell";
import AuthField, { AuthError, AuthSubmit } from "@/components/AuthField";

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
    <AuthShell>
      <div className="mx-auto w-full max-w-64">
        <Link
          href="/login"
          className="mb-6 inline-flex items-center gap-2 text-sm text-content-muted transition hover:text-content"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to sign in
        </Link>

        <h1 className="font-display text-2xl font-medium leading-tight text-content">Reset your password</h1>
        <p className="mt-2 text-sm text-content-muted">
          Enter your email and we&apos;ll send you a link to set a new password.
        </p>

        {sent ? (
          <div className="mt-6 flex flex-col items-start gap-3 rounded-sheet border-success/20 bg-success/10 p-4">
            <CheckCircle2 className="h-6 w-6 text-success" />
            <p className="text-sm text-content">
              If an account exists for that email, a reset link has been sent. Check your inbox.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <AuthField
              id="forgot-email"
              icon={Mail}
              label="Email address"
              type="email"
              value={email}
              onChange={setEmail}
              placeholder="Email address"
              autoComplete="email"
            />

            <AuthError message={error} />

            <AuthSubmit loading={loading}>Send reset link</AuthSubmit>
          </form>
        )}

        <p className="mt-6 text-xs text-content-subtle">
          Remembered it?{" "}
          <Link href="/login" className="text-highlight font-medium hover:text-danger hover:underline transition-colors">
            Sign in
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}