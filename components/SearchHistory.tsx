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
    <nav aria-labelledby="recent-searches-heading" className="mb-6 border-y border-rule py-3">
      <h2 id="recent-searches-heading" className="kin-overline mb-2 text-content-subtle">
        Recent searches
      </h2>
      <ul className="flex flex-wrap gap-2">
        {recent.map((item) => (
          <li key={item}>
            <Link
              href={`/search?q=${encodeURIComponent(item)}&type=${mediaType}`}
              title={item}
              className="kin-focus inline-flex min-h-9 max-w-full items-center rounded-control border border-rule bg-surface-raised px-3 py-1.5 text-sm text-content-muted transition-colors hover:border-highlight/35 hover:bg-surface hover:text-highlight"
            >
              <span className="truncate">{item}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
