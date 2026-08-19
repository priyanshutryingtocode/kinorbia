"use client";

import { useState } from "react";
import { Eye } from "lucide-react";
import { renderRichText } from "@/lib/renderRichText";

export default function SpoilerText({ text }: { text: string }) {
  const [revealed, setRevealed] = useState(false);

  if (!revealed) {
    return (
      <div className="relative mt-3">
        <div className="select-none whitespace-pre-wrap text-sm leading-6 text-neutral-300 opacity-50 blur-sm">
          {renderRichText(text)}
        </div>
        <button
          type="button"
          onClick={() => setRevealed(true)}
          className="absolute inset-0 flex items-center justify-center rounded-md bg-black/40 text-xs font-bold uppercase tracking-widest text-neutral-300 transition hover:text-white"
        >
          <Eye className="mr-2 h-4 w-4" />
          Spoiler — reveal
        </button>
      </div>
    );
  }

  return <div className="mt-3 whitespace-pre-wrap text-sm leading-6 text-neutral-300">{renderRichText(text)}</div>;
}