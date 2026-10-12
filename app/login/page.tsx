"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Mail, Lock } from "lucide-react";
import { signIn } from "next-auth/react";
import AuthShell from "@/components/AuthShell";
import AuthField, { AuthError, AuthSubmit } from "@/components/AuthField";
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

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Invalid email or password.");
        return;
      }

      router.push("/");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell>
      {/* No `text-center` on this wrapper. It used to sit here so the header and
          footer inherited centring, but that meant the form needed `text-left` to
          counteract it -- two opposing utilities where neither was needed. The
          header block below declares its own centring instead, and the form's
          left alignment is now just the inherited default. */}
      <div className="mx-auto w-full max-w-64">
        <div className="mb-5 text-center">
          <p className="kin-overline mb-1.5 text-highlight-muted">Welcome back</p>
          <h1 className="font-display text-xl font-medium leading-tight text-content">
            Sign in
          </h1>
          <p className="mt-1.5 text-[13px] leading-6 text-content-muted">
            Pick up your lists, journal and reviews.
          </p>
        </div>

        <div className="space-y-3.5">
          <AuthSocialBlock verb="Continue" />

          <form onSubmit={handleSubmit} className="space-y-3.5 text-left">
            <AuthField
              id="login-email"
              icon={Mail}
              label="Email address"
              type="email"
              value={email}
              onChange={setEmail}
              autoComplete="email"
            />

            <AuthField
              id="login-password"
              icon={Lock}
              label="Password"
              type="password"
              value={password}
              onChange={setPassword}
              autoComplete="current-password"
            />

            <div className="flex justify-end">
              <Link
                href="/forgot-password"
                className="text-[11px] font-medium text-content-subtle transition-colors hover:text-wordmark"
              >
                Forgot password?
              </Link>
            </div>

            <AuthError message={error} />

            <AuthSubmit loading={loading}>Sign In</AuthSubmit>
          </form>
        </div>

        <p className="mt-6 text-xs text-content-subtle">
          Need an account?{" "}
          <Link
            href="/signup"
            className="font-medium text-highlight transition-colors hover:text-wordmark hover:underline"
          >
            Sign up
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
