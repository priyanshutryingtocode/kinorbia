"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { Mail, Lock, User as UserIcon, Chrome, Loader2, CheckCircle2 } from "lucide-react";
import { signIn } from "next-auth/react";
import AuthShell from "@/components/AuthShell";

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

    const response = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    });

    if (!response.ok) {
      const data = await response.json();
      setLoading(false);
      setError(data.message || "Could not create account.");
      return;
    }

    setLoading(false);
    setRegistered(true);
  };

  return (
    <AuthShell size="tall">
      <h1 className="sr-only">Create your KinOrbia account</h1>
      <div className="w-full max-w-70 space-y-4">
        {registered ? (
          <div className="space-y-4">
            <CheckCircle2 className="w-10 h-10 mx-auto text-green-400" />
            <h2 className="text-xl font-bold text-content">Account created</h2>
            <p className="text-sm text-content">
              You can sign in now with <span className="font-semibold text-content">{email}</span>.
              Verifying your email is optional, and only needed to post publicly.
            </p>
            <Link
              href="/login"
              className="block w-full bg-accent hover:bg-accent-hover text-content font-semibold text-sm py-3.5 rounded-control transition-colors"
            >
              Go to Sign In
            </Link>
          </div>
        ) : (
          <>
            <button
              type="button"
              onClick={() => signIn("google", { callbackUrl: "/" })}
              className="w-full flex items-center justify-center gap-3 bg-white/3 hover:bg-white/8 border border-rule rounded-control py-3.5 px-4 transition-colors duration-150 group"
            >
              <Chrome className="w-5 h-5 text-content-muted group-hover:text-content transition-colors" />
              <span className="text-sm font-medium text-content group-hover:text-content transition-colors">Sign up with Google</span>
            </button>

            <div className="flex items-center gap-4 my-2">
              <div className="h-px bg-linear-to-r from-transparent via-white/10 to-transparent flex-1" />
              <span className="text-content-subtle text-[10px] font-bold uppercase tracking-widest">Or</span>
              <div className="h-px bg-linear-to-r from-transparent via-white/10 to-transparent flex-1" />
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="relative group">
                <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-content-subtle group-focus-within:text-red-400 transition-colors" />
                <label htmlFor="signup-name" className="sr-only">
                  Full name
                </label>
                <input
                  id="signup-name"
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Full Name"
                  required
                  autoComplete="name"
                  className="kin-input kin-input-affix py-3.5"
                />
              </div>

              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-content-subtle group-focus-within:text-red-400 transition-colors" />
                <label htmlFor="signup-email" className="sr-only">
                  Email address
                </label>
                <input
                  id="signup-email"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="Email address"
                  required
                  autoComplete="email"
                  className="kin-input kin-input-affix py-3.5"
                />
              </div>

              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-content-subtle group-focus-within:text-red-400 transition-colors" />
                <label htmlFor="signup-password" className="sr-only">
                  Password
                </label>
                <input
                  id="signup-password"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  className="kin-input kin-input-affix py-3.5"
                />
              </div>

              {error && (
                <p className="text-xs text-red-300 bg-accent-hover/10 border-accent/20 rounded-sheet px-3 py-2">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-accent hover:bg-accent-hover disabled:opacity-70 disabled:hover:bg-accent text-content font-semibold text-sm py-3.5 rounded-control transition-colors duration-300 flex items-center justify-center gap-2"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                Create Account
              </button>
            </form>
          </>
        )}
      </div>

      <p className="mt-8 text-xs text-content-subtle">
        Already have an account? <Link href="/login" className="text-red-400 font-medium hover:text-red-300 hover:underline transition-colors">Sign in</Link>
      </p>
    </AuthShell>
  );
}
