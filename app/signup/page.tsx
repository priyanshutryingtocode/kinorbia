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
      <h1 className="sr-only">Create your KinOrbia account</h1>
      <div className="mx-auto w-full max-w-64 space-y-3.5">
        {registered ? (
          <div className="space-y-4 text-center">
            <CheckCircle2 className="mx-auto h-10 w-10 text-success" />
            <h2 className="font-display text-xl font-medium leading-tight text-content">Account created</h2>
            <p className="text-sm text-content">
              You can sign in now with <span className="font-semibold text-content">{email}</span>.
              Verifying your email is optional, and only needed to post publicly.
            </p>
            <Link
              href="/login"
              className="block w-full bg-accent hover:bg-accent-hover text-on-accent font-semibold text-sm py-3.5 rounded-control transition-colors"
            >
              Go to Sign In
            </Link>
          </div>
        ) : (
          <>
            <AuthSocialBlock verb="Sign up" />

            <form onSubmit={handleSubmit} className="space-y-3.5">
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
                placeholder="Email address"
                autoComplete="email"
              />

              <AuthField
                id="signup-password"
                icon={Lock}
                label="Password"
                type="password"
                value={password}
                onChange={setPassword}
                placeholder="Password"
                minLength={8}
                autoComplete="new-password"
              />

              <AuthError message={error} />

              <AuthSubmit loading={loading}>Create Account</AuthSubmit>
            </form>
          </>
        )}
      </div>

      <p className="mt-6 text-xs text-content-subtle">
        Already have an account? <Link href="/login" className="text-highlight font-medium hover:text-danger hover:underline transition-colors">Sign in</Link>
      </p>
    </AuthShell>
  );
}
