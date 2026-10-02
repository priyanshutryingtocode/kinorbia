"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail, Lock, Loader2 } from "lucide-react";
import { signIn } from "next-auth/react";
import AuthShell from "@/components/AuthShell";
import AuthSocialBlock from "@/components/AuthSocialBlock";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    setLoading(true);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError("Invalid email or password.");
      return;
    }

    router.push("/");
    router.refresh();
  };

  return (
    <AuthShell>
      <h1 className="sr-only">Sign in to KinOrbia</h1>
      <div className="w-full max-w-64 space-y-3.5">
        <AuthSocialBlock verb="Continue" />

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div className="relative group">
            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-content-subtle group-focus-within:text-highlight transition-colors" />
            <label htmlFor="login-email" className="sr-only">
              Email address
            </label>
            <input
              id="login-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Email address"
              required
              autoComplete="email"
              className="kin-input kin-input-affix py-3.5"
            />
          </div>

          {/* No negative margin here. It used to carry `-mt-1`, which pulled this
              row 4px off the card's rhythm and left a 10px gap above against a
              14px gap below. It is a password affordance sitting between the email
              and password fields, so uniform spacing reads as deliberate rather
              than as a nudge. */}
          <div className="flex items-center justify-end">
            <Link
              href="/forgot-password"
              className="text-[11px] font-medium text-content-subtle hover:text-highlight transition"
            >
              Forgot password?
            </Link>
          </div>

          <div className="relative group">
            <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-content-subtle group-focus-within:text-highlight transition-colors" />
            <label htmlFor="login-password" className="sr-only">
              Password
            </label>
            <input
              id="login-password"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Password"
              required
              autoComplete="current-password"
              className="kin-input kin-input-affix py-3.5"
            />
          </div>

          {error && (
            <p className="text-xs text-danger bg-accent-hover/10 border-accent/20 rounded-sheet px-3 py-2">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-accent hover:bg-accent-hover disabled:opacity-70 disabled:hover:bg-accent text-on-accent font-semibold text-sm py-3.5 rounded-control transition-colors duration-300 flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Sign In
          </button>
        </form>
      </div>

      <p className="mt-6 text-xs text-content-subtle">
        Need an account? <Link href="/signup" className="text-highlight font-medium hover:text-danger hover:underline transition-colors">Sign up</Link>
      </p>
    </AuthShell>
  );
}
