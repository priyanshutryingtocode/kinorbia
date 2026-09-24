import type { ReactNode } from "react";
import Link from "next/link";

type ProfilePanelProps = {
  id: string;
  eyebrow?: string;
  title: string;
  description?: string;
  action?: { href: string; label: string };
  children: ReactNode;
};

export default function ProfilePanel({
  id,
  eyebrow,
  title,
  description,
  action,
  children,
}: ProfilePanelProps) {
  return (
    <section id={id} aria-labelledby={`${id}-heading`} className="scroll-mt-28">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          {eyebrow && (
            <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-gold">
              {eyebrow}
            </p>
          )}
          <h2 id={`${id}-heading`} className="font-display text-2xl font-bold text-white md:text-3xl">
            {title}
          </h2>
          {description && <p className="mt-2 max-w-2xl text-sm leading-6 text-neutral-500">{description}</p>}
        </div>
        {action && (
          <Link
            href={action.href}
            className="kin-focus w-fit rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-semibold text-neutral-300 transition hover:border-gold/30 hover:text-white"
          >
            {action.label}
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}
