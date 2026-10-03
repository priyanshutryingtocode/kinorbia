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

      // Outside the try: a throw from the navigation should not be reported to
      // the user as a failed sign-in.
      router.push("/");
      router.refresh();
    } catch {
      // Without this the rejection escaped an async event handler and
      // `loading` stayed true, leaving the button disabled with a spinner and
      // no message. forgot-password and reset-password already handled this.
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell>
      <h1 className="sr-only">Sign in to KinOrbia</h1>
      <div className="mx-auto w-full max-w-64 space-y-3.5">
        <AuthSocialBlock verb="Continue" />

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <AuthField
            id="login-email"
            icon={Mail}
            label="Email address"
            type="email"
            value={email}
            onChange={setEmail}
            placeholder="Email address"
            autoComplete="email"
          />

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

          <AuthField
            id="login-password"
            icon={Lock}
            label="Password"
            type="password"
            value={password}
            onChange={setPassword}
            placeholder="Password"
            autoComplete="current-password"
          />

          <AuthError message={error} />

          <AuthSubmit loading={loading}>Sign In</AuthSubmit>
        </form>
      </div>

      <p className="mt-6 text-xs text-content-subtle">
        Need an account? <Link href="/signup" className="text-highlight font-medium hover:text-danger hover:underline transition-colors">Sign up</Link>
      </p>
    </AuthShell>
  );
}
