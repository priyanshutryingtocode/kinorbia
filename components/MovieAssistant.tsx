"use client";

import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";
import {Bot, Loader2, Send, Sparkles, X} from "lucide-react";
import type { MovieSummary } from "@/types";
import PosterImage from "@/components/PosterImage";
import {mediaHref, normalizeMediaType} from "@/lib/media";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  movies?: MovieSummary[];
};

const STARTERS = [
  "Something cozy and funny tonight",
  "A tense thriller under 2 hours",
  "Movies like Dune but more emotional",
  "A TV series worth binging",
];

const GREETING: ChatMessage = {
  role: "assistant",
  content: "Tell me the mood, genre, pace, or vibe you want. I will suggest a few movies.",
};

const HISTORY_KEY = "kinorbia-assistant-history";

function loadHistory(): ChatMessage[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as ChatMessage[];
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch {
    // ignore corrupt history
  }

  return [];
}

function saveHistory(messages: ChatMessage[]) {
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(messages.slice(-40)));
  } catch {
    // ignore quota errors
  }
}

function movieYear(movie: MovieSummary) {
  return movie.release_date ? new Date(movie.release_date).getFullYear() : "N/A";
}

function AssistantPoster({ movie }: { movie: MovieSummary }) {
  return (
    <PosterImage
      path={movie.poster_path}
      width="w185"
      alt={movie.title}
      sizes="56px"
      className="object-cover"
    />
  );
}

export default function MovieAssistant() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const stored = loadHistory();
    return stored.length ? stored : [GREETING];
  });
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const launcherRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open) {
      inputRef.current?.focus();
    }
  }, [open]);

  const closeAssistant = (restoreFocus = true) => {
    setOpen(false);
    if (restoreFocus) {
      window.requestAnimationFrame(() => launcherRef.current?.focus());
    }
  };

  const commitMessages = (next: ChatMessage[]) => {
    setMessages(next);
    saveHistory(next);
  };

  const sendMessage = async (content: string) => {
    const trimmed = content.trim();
    if (!trimmed || loading) {
      return;
    }

    const nextMessages: ChatMessage[] = [...messages, { role: "user", content: trimmed }];
    commitMessages(nextMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/assistant/movie", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed }),
      });

      const data = await res.json();

      if (!res.ok) {
        commitMessages([
          ...nextMessages,
          {
            role: "assistant",
            content: data.message || "I could not find recommendations right now.",
          },
        ]);
        return;
      }

      commitMessages([
        ...nextMessages,
        {
          role: "assistant",
          content: data.reply || "Here are a few movies that fit.",
          movies: data.movies || [],
        },
      ]);
    } catch {
      commitMessages([
        ...nextMessages,
        {
          role: "assistant",
          content: "Something went wrong while reaching the assistant.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    sendMessage(input);
  };

  return (
    <div className="shell-assistant">
      {open && (
        <div
          id="movie-assistant-panel"
          role="region"
          aria-labelledby="movie-assistant-heading"
          className="premium-surface mb-4 flex max-h-[min(38rem,calc(100dvh-var(--shell-header-height)-6rem))] w-[calc(100vw-2.5rem)] max-w-md flex-col overflow-hidden rounded-overlay text-content ring-1 ring-white/5"
        >
          <div className="flex shrink-0 items-center justify-between border-b border-rule bg-glass px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="rounded-sheet border border-accent/20 bg-accent-hover/12 p-2 text-red-300 shadow-[0_0_28px_rgba(220,38,38,0.12)]">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h2 id="movie-assistant-heading" className="text-sm font-bold">KinOrbia Assistant</h2>
                <p className="text-xs text-content-muted">Movie picks for your mood</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => closeAssistant()}
              className="kin-focus rounded-control p-2 text-content-muted transition hover:bg-surface-raised hover:text-content"
              aria-label="Close assistant"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div
            role="log"
            aria-live="polite"
            aria-relevant="additions"
            className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4"
          >
            {messages.map((message, index) => (
              <div key={`${message.role}-${index}`} className={message.role === "user" ? "text-right" : "text-left"}>
                <div
                  className={`inline-block max-w-[85%] rounded-overlay px-4 py-3 text-sm leading-relaxed ${
                    message.role === "user"
                      ? "bg-accent text-on-accent shadow-[0_14px_32px_-22px_rgba(220,38,38,0.9)]"
                      : "border border-rule bg-glass-hover text-content"
                  }`}
                >
                  {message.content}
                </div>

                {message.movies && message.movies.length > 0 && (
                  <div className="mt-3 grid grid-cols-1 gap-2 text-left">
                    {message.movies.map((movie) => (
                      <Link
                        key={`${normalizeMediaType(movie.mediaType)}-${movie.id}`}
                        href={mediaHref(movie.mediaType, movie.id)}
                        onClick={() => closeAssistant(false)}
                        className="kin-focus flex gap-3 rounded-control border border-rule bg-glass-strong p-2 transition hover:border-accent/50 hover:bg-glass-hover"
                      >
                        <div className="relative h-20 w-14 shrink-0 overflow-hidden rounded-sheet bg-surface-raised">
                          <AssistantPoster movie={movie} />
                        </div>
                        <div className="min-w-0 py-1">
                          <p className="truncate text-sm font-bold text-content">{movie.title}</p>
                          <p className="mt-1 text-xs text-content-subtle">
                            {movieYear(movie)} - TMDB {movie.vote_average.toFixed(1)}
                          </p>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex items-center gap-2 text-sm text-content-muted">
                <Loader2 className="h-4 w-4 animate-spin text-red-400" />
                Thinking through the watchlist...
              </div>
            )}
          </div>

          <div className="shrink-0 border-t border-rule p-4">
            <div className="mb-3 flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
              {STARTERS.map((starter) => (
                <button
                  key={starter}
                  type="button"
                  onClick={() => sendMessage(starter)}
                  className="kin-focus shrink-0 rounded-full border border-rule bg-surface px-3 py-1.5 text-xs text-content transition hover:border-accent/50 hover:bg-accent-hover/10 hover:text-content"
                >
                  {starter}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="flex gap-2">
              <label htmlFor="movie-assistant-input" className="sr-only">Ask for a movie recommendation</label>
              <input
                ref={inputRef}
                id="movie-assistant-input"
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="What do you want to watch?"
                className="kin-input min-w-0 flex-1"
              />
              <button
                type="submit"
                disabled={loading}
                className="kin-focus flex h-11 w-11 shrink-0 items-center justify-center rounded-control bg-accent text-on-accent transition hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Send message"
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
              </button>
            </form>
          </div>
        </div>
      )}

      <button
        ref={launcherRef}
        type="button"
        onClick={() => (open ? closeAssistant() : setOpen(true))}
        className="kin-focus ml-auto flex h-14 w-14 items-center justify-center rounded-full border border-glass-line-strong bg-accent/90 text-on-accent shadow-card-hover backdrop-blur-xl transition hover:scale-105 hover:bg-accent-hover"
        aria-label={open ? "Close movie assistant" : "Open movie assistant"}
        aria-expanded={open}
        aria-controls="movie-assistant-panel"
      >
        {open ? <X className="h-6 w-6" /> : <Bot className="h-6 w-6" />}
      </button>
    </div>
  );
}
