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

  const onToggle = useCallback(async () => {
    if (askAboutSharing && !initialIsWatched) {
      setAsking(true);
      return;
    }
    await toggle();
  }, [askAboutSharing, initialIsWatched, toggle]);
  
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