"use client";

import { movieRefPayload } from "@/lib/mediaDetail";
import { useCallback, useState } from "react";
import { Check, Eye } from "lucide-react";
import type { DetailSummary } from "@/lib/mediaDetail";
import { MediaToggleButton, useMediaToggle } from "@/components/MediaToggle";
import AccessibleDialog from "@/components/AccessibleDialog";
import ShareActivityToggle from "@/components/ShareActivityToggle";

const MESSAGES = {
  signIn: "Sign in to mark movies as watched.",
  error: "Could not mark this movie as watched.",
  added: "Marked as watched.",
};

type WatchedButtonProps = {
  movie: DetailSummary;
  initialIsWatched: boolean;
  // True only the first time this member marks anything watched. The dialog resolves the
  // preference BEFORE the write, because markWatched stamps `watched.broadcast` from the
  // stored flag at write time -- asking afterwards would retroactively broadcast a watch
  // the member was told was private.
  askAboutSharing?: boolean;
};

export default function WatchedButton({ movie, initialIsWatched, askAboutSharing = false }: WatchedButtonProps) {
  const [asking, setAsking] = useState(false);

  const { active, loading, locked, toggle } = useMediaToggle({
    endpoint: "/api/user/journal",
    payload: movieRefPayload(movie),
    messages: MESSAGES,
    initialActive: initialIsWatched,
    lockWhenActive: true,
  });

  // Answered either way once the dialog closes, so it never reappears.
  const onToggle = useCallback(async () => {
    if (askAboutSharing && !initialIsWatched) {
      setAsking(true);
      return;
    }
    await toggle();
  }, [askAboutSharing, initialIsWatched, toggle]);

  // The answer is already persisted by the toggle itself; the dialog only needs closing.
  const finish = useCallback(async () => {
    setAsking(false);
    await toggle();
  }, [toggle]);

  return (
    <>
      <MediaToggleButton
        active={active}
        loading={loading}
        disabled={loading || locked}
        activeClassName="border-transparent bg-success-solid text-on-accent shadow-float"
        icon={Eye}
        activeIcon={Check}
        label={active ? "Watched" : "Mark as watched"}
        onClick={onToggle}
      />

      <AccessibleDialog
        open={asking}
        onClose={() => setAsking(false)}
        titleId="share-activity-prompt-title"
      >
        <div className="space-y-4">
          <h2
            id="share-activity-prompt-title"
            className="font-display text-xl font-medium leading-tight text-content"
          >
            Share what you watch?
          </h2>
          <p className="text-sm leading-6 text-content-muted">
            People who follow you can see titles you mark watched in their activity feed.
            You can change this at any time in Settings, and turning it off removes what has
            already been shared.
          </p>

          <ShareActivityToggle initialShare={false} onAnswered={() => finish()} />
        </div>
      </AccessibleDialog>
    </>
  );
}