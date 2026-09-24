"use client";

import { FormEvent, ReactNode } from "react";
import { recordRecentSearch, type SearchMediaType } from "@/lib/searchHistory";

type SearchTrackerFormProps = {
  mediaType: SearchMediaType;
  children: ReactNode;
};

export default function SearchTrackerForm({ mediaType, children }: SearchTrackerFormProps) {
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    const formData = new FormData(event.currentTarget);
    const query = String(formData.get("q") ?? "").trim();
    if (query) {
      recordRecentSearch(mediaType, query);
    }
  };

  return (
    <form
      action="/search"
      method="get"
      role="search"
      aria-label={mediaType === "tv" ? "Search TV shows" : "Search movies"}
      onSubmit={handleSubmit}
      className="kin-panel mb-8 p-4 sm:p-5"
    >
      <input type="hidden" name="type" value={mediaType} />
      {children}
    </form>
  );
}
