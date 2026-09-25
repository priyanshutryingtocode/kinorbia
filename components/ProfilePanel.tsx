import type { ReactNode } from "react";
import Link from "next/link";
import HeaderBlock from "@/components/HeaderBlock";

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
    <section id={id} aria-labelledby={`${id}-heading`} className="scroll-mt-32">
      <HeaderBlock
        eyebrow={eyebrow}
        title={title}
        titleId={`${id}-heading`}
        titleTag="h2"
        description={description}
        actions={
          action && (
            <Link
              href={action.href}
              className="kin-focus group inline-flex w-fit items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-neutral-400 transition hover:text-gold"
            >
              {action.label}
              <span className="text-red-400 transition-transform group-hover:translate-x-0.5" aria-hidden="true">
                →
              </span>
            </Link>
          )
        }
        wrapActions={false}
        rowClassName="mb-5 flex flex-col gap-3 border-t border-white/10 pt-5 sm:flex-row sm:items-end sm:justify-between"
        eyebrowClassName="kin-overline mb-1.5 text-gold/80"
        titleClassName="font-display text-2xl font-medium leading-tight text-white md:text-3xl"
        descriptionTag="p"
        descriptionClassName="mt-2 max-w-2xl text-sm leading-6 text-neutral-400"
      />
      {children}
    </section>
  );
}
