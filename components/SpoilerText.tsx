"use client";

import { useId, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { renderRichText } from "@/lib/renderRichText";

export default function SpoilerText({ text }: { text: string }) {
  const [revealed, setRevealed] = useState(false);
  const contentId = useId();

  return (
    <div className={revealed ? undefined : "rounded-control border border-rule bg-surface-raised px-3 py-2.5"}>
      <div id={contentId} hidden={!revealed} className="whitespace-pre-wrap break-words text-sm leading-6 text-content-muted [overflow-wrap:anywhere]">
        {renderRichText(text)}
      </div>
      <button
        type="button"
        onClick={() => setRevealed((value) => !value)}
        aria-expanded={revealed}
        aria-controls={contentId}
        aria-label={revealed ? "Hide spoiler text" : "Reveal spoiler text"}
        className={`kin-focus inline-flex items-center gap-2 rounded-control text-xs font-medium transition-colors ${
          revealed
            ? "mt-2 text-content-subtle hover:text-content"
            : "uppercase tracking-overline text-content-muted hover:text-highlight"
        }`}
      >
        {revealed ? (
          <EyeOff className="h-3.5 w-3.5" aria-hidden="true" />
        ) : (
          <Eye className="h-4 w-4" aria-hidden="true" />
        )}
        {revealed ? "Hide spoiler" : "Spoiler hidden — reveal"}
      </button>
    </div>
  );
}