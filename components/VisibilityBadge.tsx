import { Globe2, LockKeyhole } from "lucide-react";

type Visibility = "public" | "private";

export type VisibilityBadgeProps = {
  visibility: Visibility;
};

export default function VisibilityBadge({ visibility }: VisibilityBadgeProps) {
  const Icon = visibility === "public" ? Globe2 : LockKeyhole;

  return (
    <span
      data-visibility={visibility}
      className={`inline-flex shrink-0 items-center gap-1 rounded-control border px-2 py-1 text-overline font-medium uppercase tracking-overline ${
        visibility === "public"
          ? "border-highlight/25 bg-highlight-soft text-highlight"
          : "border-rule-strong bg-surface-raised text-content-muted"
      }`}
    >
      <Icon className="h-3 w-3" aria-hidden="true" />
      {visibility}
    </span>
  );
}
