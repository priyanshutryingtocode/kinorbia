import Link from "next/link";
import { AlertTriangle, FileQuestion, RotateCcw, UserX } from "lucide-react";
import type { LucideIcon } from "lucide-react";

type VariantConfig = {
  kind: "error" | "not-found";
  defaultTitle: string;
  defaultDescription: string;
  defaultAction: string;
  rule: string;
  icon: LucideIcon;
  iconColor: string;
  heading: string;
  body: string;
  action: string;
};

const VARIANTS = {
  routeError: {
    kind: "error",
    defaultTitle: "This page could not be loaded",
    defaultDescription: "The data may be temporarily unavailable. Please try again.",
    defaultAction: "",
    rule: "bg-accent",
    icon: AlertTriangle,
    iconColor: "text-red-300",
    heading: "text-content",
    body: "text-content-muted",
    action: "rounded-control bg-accent transition-colors hover:bg-accent-hover",
  },
  profileError: {
    kind: "error",
    defaultTitle: "This profile could not be loaded",
    defaultDescription: "The data may be temporarily unavailable. Please try again.",
    defaultAction: "",
    rule: "bg-accent-hover",
    icon: AlertTriangle,
    iconColor: "text-red-300",
    heading: "text-content",
    body: "text-content-muted",
    action: "rounded-sm bg-accent transition-colors hover:bg-accent-hover",
  },
  routeNotFound: {
    kind: "not-found",
    defaultTitle: "Page not found",
    defaultDescription: "The page may have moved or is no longer available.",
    defaultAction: "Return home",
    rule: "bg-highlight",
    icon: FileQuestion,
    iconColor: "text-content-subtle",
    heading: "text-content",
    body: "text-content-muted",
    action: "rounded-control bg-accent transition-colors hover:bg-accent-hover",
  },
  profileNotFound: {
    kind: "not-found",
    defaultTitle: "Profile not found",
    defaultDescription: "This member may have changed their username or no longer be available.",
    defaultAction: "Browse KinOrbia",
    rule: "bg-gold",
    icon: UserX,
    iconColor: "text-content-subtle",
    heading: "text-content",
    body: "text-content-muted",
    action: "rounded-sm bg-accent transition-colors hover:bg-accent-hover",
  },
} satisfies Record<string, VariantConfig>;

// Derived rather than hand-written: the old local union was a second place to
// remember a variant, and keeping them in sync is what forced the four one-line
// wrapper components that existed only to name each variant.
type Variant = keyof typeof VARIANTS;

type StatusStateCommon = {
  title?: string;
  description?: string;
};

// A discriminated union so the variant itself decides which extra props are
// legal: an error state owns a retry button, a not-found state owns a link.
// This used to be enforced by four wrapper components that each hardcoded the
// right `Omit<...>`; expressing it in the props type keeps the same guarantee
// without the extra files.
type ErrorVariant = Extract<Variant, "routeError" | "profileError">;
type NotFoundVariant = Exclude<Variant, ErrorVariant>;

type StatusStateProps = StatusStateCommon &
  (
    | { variant: ErrorVariant; onRetry?: () => void; href?: never; action?: never }
    | { variant: NotFoundVariant; href?: string; action?: string; onRetry?: never }
  );

export default function StatusState({ variant, title, description, onRetry, href, action }: StatusStateProps) {
  const config = VARIANTS[variant];
  const Icon = config.icon;

  return (
    <div
      className="flex min-h-[55svh] items-center justify-center px-4 py-16"
      role={config.kind === "error" ? "alert" : undefined}
    >
      <div className="profile-masthead w-full max-w-lg p-8">
        <div className={`h-px w-10 ${config.rule}`} />
        <Icon className={`mt-6 h-5 w-5 ${config.iconColor}`} aria-hidden="true" />
        <h1 className={`mt-4 font-display text-2xl font-medium ${config.heading}`}>
          {title ?? config.defaultTitle}
        </h1>
        <p className={`mt-2 text-sm leading-6 ${config.body}`}>{description ?? config.defaultDescription}</p>
        {config.kind === "error" ? (
          onRetry && (
            <button
              type="button"
              onClick={onRetry}
              className={`kin-focus mt-6 inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold text-content ${config.action}`}
            >
              <RotateCcw className="h-4 w-4" aria-hidden="true" />
              Try again
            </button>
          )
        ) : (
          <Link
            href={href ?? "/"}
            className={`kin-focus mt-6 inline-flex px-4 py-2 text-sm font-semibold text-content ${config.action}`}
          >
            {action ?? config.defaultAction}
          </Link>
        )}
      </div>
    </div>
  );
}
