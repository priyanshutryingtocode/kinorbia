"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

export default function SearchHistory({ query }: { query: string }) {
  const [recent, setRecent] = useState<string[]>([]);

  useEffect(() => {
    const stored = JSON.parse(localStorage.getItem("kinorbia:recent-searches") || "[]") as string[];
    const next = query
      ? [query, ...stored.filter((item) => item.toLowerCase() !== query.toLowerCase())].slice(0, 6)
      : stored.slice(0, 6);

    localStorage.setItem("kinorbia:recent-searches", JSON.stringify(next));
    window.requestAnimationFrame(() => setRecent(next));
  }, [query]);

  if (recent.length === 0) {
    return null;
  }

  return (
    <div className="mb-8">
      <p className="text-xs font-bold uppercase tracking-wider text-neutral-500 mb-3">Recent Searches</p>
      <div className="flex flex-wrap gap-2">
        {recent.map((item) => (
          <Link
            key={item}
            href={`/search?q=${encodeURIComponent(item)}`}
            className="text-sm px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-neutral-300 hover:text-white hover:border-red-500/40 transition"
          >
            {item}
          </Link>
        ))}
      </div>
    </div>
  );
}
