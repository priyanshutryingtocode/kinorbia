import type { ReactNode } from "react";
import Link from "next/link";

type StatCardProps = {
  icon: ReactNode;
  label: string;
  value: string;
  detail?: string;
  href?: string;
  emphasis?: "default" | "gold" | "red";
};

export default function StatCard({
  icon,
  label,
  value,
  detail,
  href,
  emphasis = "default",
}: StatCardProps) {
  const valueColor =
    emphasis === "gold"
      ? "text-gold"
      : emphasis === "red"
        ? "text-red-300"
        : "text-white";
  const content = (
    <>
      <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5">
        {icon}
      </div>
      <p className={`font-display text-3xl font-bold leading-none ${valueColor}`}>{value}</p>
      <p className="mt-2 text-xs font-semibold uppercase tracking-[0.16em] text-neutral-500">{label}</p>
      {detail && <p className="mt-2 text-xs leading-5 text-neutral-500">{detail}</p>}
    </>
  );
  const className = `premium-card block h-full rounded-card p-5 ${
    href ? "kin-focus transition hover:-translate-y-0.5 hover:border-gold/30" : ""
  }`;

  if (href) {
    return (
      <Link href={href} className={className}>
        {content}
      </Link>
    );
  }

  return <div className={className}>{content}</div>;
}
