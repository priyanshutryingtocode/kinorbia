import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCircle2, MailWarning } from "lucide-react";

type VerifyEmailPageProps = {
  searchParams: Promise<{ status?: string; token?: string }> | { status?: string; token?: string };
};

// The status is supplied by a redirect from /api/verify-email, so the shell must
// render per request rather than being baked at build time.
export const dynamic = "force-dynamic";

const COPY = {
  success: {
    icon: CheckCircle2,
    iconClass: "text-emerald-400",
    title: "Email verified",
    body: "You can now post public reviews, lists, and comments.",
  },
  already: {
    icon: CheckCircle2,
    iconClass: "text-emerald-400",
    title: "Email already verified",
    body: "This address is already confirmed. Nothing else to do.",
  },
  invalid: {
    icon: MailWarning,
    iconClass: "text-amber-400",
    title: "This link is no longer valid",
    body: "Verification links expire after an hour and work only once. Request a fresh one from your profile.",
  },
} as const;

export default async function VerifyEmailPage({ searchParams }: VerifyEmailPageProps) {
  const { status, token } = await searchParams;

  // Links sent before redemption moved into a route handler point straight at
  // this path with a `token`. Hand those to the handler so outstanding links
  // still redeem instead of reporting themselves invalid.
  if (!status && token) {
    redirect(`/api/verify-email?token=${encodeURIComponent(token)}`);
  }

  const copy = status && status in COPY ? COPY[status as keyof typeof COPY] : COPY.invalid;
  const Icon = copy.icon;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-canvas p-6 text-center text-content">
      <Icon className={`h-10 w-10 ${copy.iconClass}`} />
      <h1 className="mt-4 text-3xl font-bold">{copy.title}</h1>
      <p className="mt-4 max-w-md text-content-muted">{copy.body}</p>
      <Link
        href="/"
        className="mt-8 rounded-full bg-accent px-6 py-3 text-sm font-bold text-content transition hover:bg-accent-hover"
      >
        Back to KinOrbia
      </Link>
    </div>
  );
}
