"use client";

import { FormEvent, ReactNode } from "react";
import { recordRecentSearch, type SearchMediaType } from "@/lib/searchHistory";

type SearchTrackerFormProps = {
  mediaType: SearchMediaType;
  children: ReactNode;
};

// Renders the plain GET search form and records the query into the
// per-media-type history only when the form is actually submitted. Toggling
// the Movies/Shows tab never touches history.
export default function SearchTrackerForm({ mediaType, children }: SearchTrackerFormProps) {
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    const formData = new FormData(event.currentTarget);
    const query = String(formData.get("q") ?? "").trim();
    if (query) {
      recordRecentSearch(mediaType, query);
    }
  };

  return (
    <form action="/search" onSubmit={handleSubmit} className="bg-neutral-900/50 border border-white/10 rounded-xl p-4 mb-10">
      <input type="hidden" name="type" value={mediaType} />
      {children}
    </form>
  );
}
