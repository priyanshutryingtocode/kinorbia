import Link from "next/link";
import { UserX } from "lucide-react";

export default function ProfileNotFoundState({
  title = "Profile not found",
  description = "This member may have changed their username or no longer be available.",
  href = "/",
  action = "Browse KinOrbia",
}: {
  title?: string;
  description?: string;
  href?: string;
  action?: string;
}) {
  return (
    <div className="flex min-h-[55svh] items-center justify-center px-4 py-16">
      <div className="profile-masthead w-full max-w-lg p-8">
        <div className="h-px w-10 bg-gold" />
        <UserX className="mt-6 h-5 w-5 text-neutral-500" aria-hidden="true" />
        <h1 className="mt-4 font-display text-2xl font-medium text-white">{title}</h1>
        <p className="mt-2 text-sm leading-6 text-neutral-400">{description}</p>
        <Link href={href} className="kin-focus mt-6 inline-flex rounded-sm bg-red-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-red-500">
          {action}
        </Link>
      </div>
    </div>
  );
}
