import type { ReactNode } from "react";

export default function StatCard({
  icon,
  label,
  value,
  hover = false,
}: {
  icon: ReactNode;
  label: string;
  value: string;
  hover?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-4 rounded-xl border border-white/5 bg-neutral-900/50 p-4 ${
        hover ? "cursor-default transition hover:bg-neutral-900" : ""
      }`}
    >
      <div className="shrink-0 rounded-full bg-white/5 p-3">{icon}</div>
      <div className="min-w-0">
        <div className="text-2xl font-bold text-white">{value}</div>
        <div className="text-xs uppercase tracking-wider text-neutral-500">{label}</div>
      </div>
    </div>
  );
}
