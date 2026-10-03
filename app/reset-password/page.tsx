"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, Lock, CheckCircle2 } from "lucide-react";
import AuthField, { AuthError, AuthSubmit } from "@/components/AuthField";
import { Suspense } from "react";
import AuthShell from "@/components/AuthShell";

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
      <div className="mt-6 flex flex-col items-start gap-3 rounded-sheet border-success/20 bg-success/10 p-4">
        <CheckCircle2 className="h-6 w-6 text-success" />
        <p className="text-sm text-content">
          Your password has been updated. You can now sign in.
        </p>
        <Link href="/login" className="text-sm font-bold text-highlight hover:text-danger hover:underline transition-colors">
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="mt-6 space-y-4">
      {/* Both of these were among the three wrappers missing `group`. */}
      <AuthField
        id="reset-password"
        icon={Lock}
        label="New password"
        type="password"
        value={password}
        onChange={setPassword}
        placeholder="New password"
        minLength={8}
        autoComplete="new-password"
      />

      <AuthField
        id="reset-password-confirm"
        icon={Lock}
        label="Confirm new password"
        type="password"
        value={confirm}
        onChange={setConfirm}
        placeholder="Confirm new password"
        minLength={8}
        autoComplete="new-password"
      />

      <AuthError message={error} />

      <AuthSubmit loading={loading}>Set new password</AuthSubmit>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <AuthShell>
      {/* Same `mx-auto w-full max-w-64` column as login and signup, wrapping the
          heading and the form together so `ResetPasswordForm`'s `mt-6` still
          measures from the subtitle. */}
      <div className="mx-auto w-full max-w-64">
        {/* Same lead-in as forgot-password. Without it the card offered only the
            wordmark above it, which goes home rather than back to the form the
            link was opened from. */}
        <Link
          href="/login"
          className="mb-6 inline-flex items-center gap-2 text-sm text-content-muted transition hover:text-content"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to sign in
        </Link>

        <h1 className="font-display text-2xl font-medium leading-tight text-content">Choose a new password</h1>
        <p className="mt-2 text-sm text-content-muted">Enter and confirm your new password below.</p>
        <Suspense fallback={null}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </AuthShell>
  );
}