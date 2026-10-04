import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCircle2, MailWarning } from "lucide-react";
import AuthShell from "@/components/AuthShell";

type VerifyEmailPageProps = {
  searchParams: Promise<{ status?: string; token?: string }> | { status?: string; token?: string };
};

export const dynamic = "force-dynamic";

const COPY = {
  success: {
    icon: CheckCircle2,
    iconClass: "text-success",
    title: "Email verified",
    body: "You can now post public reviews, lists, and comments.",
  },
  already: {
    icon: CheckCircle2,
    iconClass: "text-success",
    title: "Email already verified",
    body: "This address is already confirmed. Nothing else to do.",
  },

  invalid: {
    icon: MailWarning,
    iconClass: "text-danger",
    title: "This link is no longer valid",
    body: "Verification links expire after an hour and work only once. Request a fresh one from your profile.",
  },
} as const;

export default async function VerifyEmailPage({ searchParams }: VerifyEmailPageProps) {
  const { status, token } = await searchParams;

  if (!status && token) {
    redirect(`/api/verify-email?token=${encodeURIComponent(token)}`);
  }

  const copy = status && status in COPY ? COPY[status as keyof typeof COPY] : COPY.invalid;
  const Icon = copy.icon;

  return (
    <AuthShell>

      <div className="mx-auto w-full max-w-64 text-center">
        <Icon className={`mx-auto h-10 w-10 ${copy.iconClass}`} />
        <h1 className="mt-4 font-display text-2xl font-medium leading-tight text-content">
          {copy.title}
        </h1>
        <p className="mt-2 text-sm text-content-muted">{copy.body}</p>
        <Link
          href="/"
          className="mt-6 w-full bg-accent hover:bg-accent-hover text-on-accent font-semibold text-sm py-3.5 rounded-control transition-colors duration-300 flex items-center justify-center gap-2"
        >
          Back to KinOrbia
        </Link>
      </div>
    </AuthShell>
  );
}
