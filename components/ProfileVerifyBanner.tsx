"use client";

import { useState } from "react";
import { MailCheck, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ToastProvider";

type ProfileVerifyBannerProps = {
  verified: boolean;
};

export default function ProfileVerifyBanner({ verified }: ProfileVerifyBannerProps) {
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const router = useRouter();
  const { showToast } = useToast();

  if (verified || sent) {
    return null;
  }

  const requestVerification = async () => {
    setLoading(true);

    try {
      const res = await fetch("/api/user/verify-email", { method: "POST" });

      if (res.status === 401) {
        showToast("Sign in to verify your email.", "info");
        router.push("/login");
        return;
      }

      const data = await res.json().catch(() => null);

      if (!res.ok) {
        showToast(data?.message || "Could not send the verification email.", "error");
        return;
      }

      setSent(true);
      showToast(data?.message || "Verification link sent. Check your inbox.", "success");
    } catch {
      showToast("Could not send the verification email.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section
      aria-label="Email verification"
      className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-control)] border border-amber-500/25 bg-amber-500/5 px-4 py-3"
    >
      <div className="flex items-start gap-3">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-amber-300" aria-hidden="true" />
        <div className="space-y-0.5">
          <p className="text-sm font-semibold text-content">Verify your email to post publicly</p>
          <p className="text-xs leading-5 text-content-muted">
            Your journal, favorites, and watchlist are private either way. Public reviews, lists,
            comments, and follows need a confirmed address.
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={requestVerification}
        disabled={loading}
        className="kin-focus inline-flex min-h-10 shrink-0 items-center justify-center gap-2 rounded-[var(--radius-control)] border border-amber-500/40 px-3.5 py-2 text-sm font-semibold text-amber-200 transition-colors hover:bg-amber-500/10 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <MailCheck className="h-4 w-4" aria-hidden="true" />
        {loading ? "Sending..." : "Verify email"}
      </button>
    </section>
  );
}
