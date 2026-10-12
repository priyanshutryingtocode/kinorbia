"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { Mail, Lock, User as UserIcon, CheckCircle2 } from "lucide-react";
import AuthShell from "@/components/AuthShell";
import AuthField, { AuthError, AuthSubmit } from "@/components/AuthField";
import AuthSocialBlock from "@/components/AuthSocialBlock";

export default function SignUpPage() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [registered, setRegistered] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");

    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    setLoading(true);

    try {
      const response = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => null);
        setError(data?.message || "Could not create account.");
        return;
      }

      setRegistered(true);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell>
      {/* No `text-center` on this wrapper -- it made the header inherit centring and
          forced the form to counteract it with `text-left`. The header now
          declares its own centring, and the form relies on the left default.
          The registered-success card keeps `text-center` because it is genuinely
          all centred copy. */}
      <div className="mx-auto w-full max-w-64">
        {!registered && (
          <div className="mb-5 text-center">
            <p className="kin-overline mb-1.5 text-highlight-muted">Get started</p>
            <h1 className="font-display text-xl font-medium leading-tight text-content">
              Create an account
            </h1>
            <p className="mt-1.5 text-[13px] leading-6 text-content-muted">
              Track what you watch and keep a journal of it.
            </p>
          </div>
        )}

        {registered ? (
          <div className="space-y-3.5 text-center">
            <CheckCircle2 className="mx-auto h-10 w-10 text-success" />
            <h2 className="font-display text-lg font-medium leading-tight text-content">Account created</h2>
            <p className="text-[13px] text-content">
              You can sign in now with <span className="font-semibold text-content">{email}</span>.
              Verifying your email is optional, and only needed to post publicly.
            </p>
            <Link
              href="/login"
              className="block w-full bg-accent hover:bg-accent-hover text-on-accent font-semibold text-[13px] py-3 rounded-control transition-colors"
            >
              Go to Sign In
            </Link>
          </div>
        ) : (
          <div className="space-y-3.5">
            <AuthSocialBlock verb="Sign up" />

            <form onSubmit={handleSubmit} className="space-y-3.5 text-left">
              <AuthField
                id="signup-name"
                icon={UserIcon}
                label="Full name"
                value={name}
                onChange={setName}
                placeholder="Full Name"
                autoComplete="name"
              />

              <AuthField
                id="signup-email"
                icon={Mail}
                label="Email address"
                type="email"
                value={email}
                onChange={setEmail}
                autoComplete="email"
              />

              <AuthField
                id="signup-password"
                icon={Lock}
                label="Password"
                type="password"
                value={password}
                onChange={setPassword}
                minLength={8}
                autoComplete="new-password"
                hint="At least 8 characters"
              />

              <AuthError message={error} />

              <AuthSubmit loading={loading}>Create Account</AuthSubmit>
            </form>
          </div>
        )}

        {!registered && (
          <p className="mt-6 text-xs text-content-subtle">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-medium text-highlight transition-colors hover:text-wordmark hover:underline"
            >
              Sign in
            </Link>
          </p>
        )}
      </div>
    </AuthShell>
  );
}
