import Link from "next/link";

type ProfileMetricEmphasis = "neutral" | "red" | "gold";

type ProfileMetricItem = {
  label: string;
  value: string | number;
  detail?: string;
  href?: string;
  emphasis?: ProfileMetricEmphasis;
};

type ProfileMetricRailProps = {
  metrics: ProfileMetricItem[];
  ariaLabel?: string;
  className?: string;
};

const valueColors: Record<ProfileMetricEmphasis, string> = {
  neutral: "text-content",
  red: "text-accent-text",
  gold: "text-highlight",
};

export default function ProfileMetricRail({
  metrics,
  ariaLabel = "Profile metrics",
  className,
}: ProfileMetricRailProps) {
  if (metrics.length === 0) {
    return null;
  }

  return (
    <ul
      aria-label={ariaLabel}
      className={[
        "grid list-none grid-cols-[repeat(auto-fit,minmax(8.5rem,1fr))] gap-px overflow-hidden rounded-sm border border-rule bg-surface-raised p-0",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {metrics.map(({ label, value, detail, href, emphasis = "neutral" }) => {
        const content = (
          <>
            <p className="kin-overline text-content-muted">{label}</p>
            <p className={`mt-1.5 break-words font-display text-2xl font-medium leading-none sm:text-3xl ${valueColors[emphasis]}`}>
              {value}
            </p>
            {detail && <p className="mt-1.5 text-[11px] leading-4 text-content-muted">{detail}</p>}
          </>
        );
        const itemClass =
          "block h-full bg-canvas p-4 outline-none transition-colors focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-accent/80 hover:bg-surface-raised/80 sm:p-5";

        return (
          <li key={`${label}-${String(value)}`} className="min-w-0 bg-canvas">
            {href ? (
              <Link href={href} className={itemClass}>
                {content}
              </Link>
            ) : (
              <div className={itemClass}>{content}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
