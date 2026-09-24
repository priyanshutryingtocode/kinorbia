import Link from "next/link";
import { FileQuestion } from "lucide-react";

export default function RouteNotFoundState({
  title = "Page not found",
  description = "The page may have moved or is no longer available.",
  href = "/",
  action = "Return home",
}: {
  title?: string;
  description?: string;
  href?: string;
  action?: string;
}) {
  return (
    <div className="flex min-h-[55svh] items-center justify-center px-4 py-16">
      <div className="profile-masthead w-full max-w-lg p-8">
        <div className="h-px w-10 bg-highlight" />
        <FileQuestion className="mt-6 h-5 w-5 text-content-subtle" aria-hidden="true" />
        <h1 className="mt-4 font-display text-2xl font-medium text-content">{title}</h1>
        <p className="mt-2 text-sm leading-6 text-content-muted">{description}</p>
        <Link
          href={href}
          className="kin-focus mt-6 inline-flex rounded-control bg-accent px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent-hover"
        >
          {action}
        </Link>
      </div>
    </div>
  );
}
