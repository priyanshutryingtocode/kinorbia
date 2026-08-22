"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { readRecentSearches, type SearchMediaType } from "@/lib/searchHistory";

export default function SearchHistory({ mediaType }: { mediaType: SearchMediaType }) {
  const [recent, setRecent] = useState<string[]>([]);

  useEffect(() => {
    setRecent(readRecentSearches(mediaType));
  }, [mediaType]);

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
            href={`/search?q=${encodeURIComponent(item)}&type=${mediaType}`}
            className="text-sm px-3 py-1.5 rounded-full bg-white/5 border border-white/10 text-neutral-300 hover:text-white hover:border-red-500/40 transition"
          >
            {item}
          </Link>
        ))}
      </div>
    </div>
  );
}
