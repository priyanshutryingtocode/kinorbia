"use client";

import SubmitButton from "@/components/SubmitButton";

type LoadMoreButtonProps = {
  loading: boolean;
  hasMore: boolean;
  error?: string | null;
  onLoadMore: () => void;
  label: string;
};

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
