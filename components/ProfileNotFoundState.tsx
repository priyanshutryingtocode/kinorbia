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
    <div className="flex min-h-[65svh] items-center justify-center px-4 py-20">
      <div className="premium-card w-full max-w-lg rounded-panel p-8 text-center">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full border border-white/10 bg-white/5 text-neutral-400">
          <UserX className="h-6 w-6" aria-hidden="true" />
        </span>
        <h1 className="mt-5 font-display text-2xl font-bold text-white">{title}</h1>
        <p className="mt-2 text-sm leading-6 text-neutral-400">{description}</p>
        <Link href={href} className="kin-focus mt-6 inline-flex rounded-full bg-red-600 px-5 py-2 text-sm font-semibold text-white transition hover:bg-red-500">
          {action}
        </Link>
      </div>
    </div>
  );
}
