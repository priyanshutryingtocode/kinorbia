"use client";

import SubmitButton from "@/components/SubmitButton";

type LoadMoreButtonProps = {
  loading: boolean;
  hasMore: boolean;
  error?: string | null;
  onLoadMore: () => void;
  // The two call sites differ only in this word: "Load more" under a poster
  // grid, "Load more results" under search rows.
  label: string;
};

// The foot of a paginated list: a button, and the error it might have produced.
//
// This was written out in full in MovieGrid and SearchLoadMore -- eighteen lines
// that were byte-identical except for the button label. The shared `useLoadMore`
// hook had already made the two call sites behave identically; only the markup
// was duplicated, which is the kind of drift that survives until someone edits
// one copy.
export default function LoadMoreButton({
  loading,
  hasMore,
  error,
  onLoadMore,
  label,
}: LoadMoreButtonProps) {
  if (!hasMore) {
    return null;
  }

  return (
    <div className="mt-10 flex flex-col items-center gap-3">
      <SubmitButton
        type="button"
        variant="secondary"
        loading={loading}
        pendingLabel="Loading..."
        onClick={onLoadMore}
      >
        {label}
      </SubmitButton>
      {error && (
        <p role="alert" className="text-xs text-accent-hover">
          {error}
        </p>
      )}
    </div>
  );
}
