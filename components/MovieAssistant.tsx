"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useEffect, useRef, useState } from "react";
import { Bot, Film, Loader2, Send, Sparkles, X } from "lucide-react";
import type { MovieSummary } from "@/types";
import AssistantMovieActions from "./AssistantMovieActions";
import { normalizeMediaType } from "@/lib/media";

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

const THREAD_KEY = "kinorbia-assistant-thread";
const HISTORY_KEY = "kinorbia-assistant-history";

function getThreadId() {
  if (typeof window === "undefined") {
    return "";
  }

  let id = localStorage.getItem(THREAD_KEY);
  if (!id) {
    id =
      typeof crypto.randomUUID === "function"
        ? crypto.randomUUID()
        : `t-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(THREAD_KEY, id);
  }

  return id;
}

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

export default function MovieAssistant() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const stored = loadHistory();
    return stored.length ? stored : [GREETING];
  });
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  // One shared lists snapshot per assistant open, instead of every movie
  // card firing its own /api/user/lists request.
  const [lists, setLists] = useState<{ id: string; title: string }[]>([]);

  useEffect(() => {
    if (!open) {
      return;
    }

    let active = true;
    fetch("/api/user/lists")
      .then(async (res) => {
        if (!res.ok) return;
        const data = await res.json();
        if (active) setLists(data.lists || []);
      })
      .catch(() => {});

    return () => {
      active = false;
      setLists([]);
    };
  }, [open]);

  const commitMessages = (next: ChatMessage[]) => {
    setMessages(next);
    saveHistory(next);
  };

  const sendMessage = async (content: string) => {
    const trimmed = content.trim();
    if (!trimmed || loading) {
      return;
    }

    const history = messages.slice(-8).map((message) => ({
      role: message.role,
      content: message.content,
    }));

    const nextMessages: ChatMessage[] = [...messages, { role: "user", content: trimmed }];
    commitMessages(nextMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/assistant/movie", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: trimmed,
          history,
          threadId: getThreadId(),
        }),
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
    <div className="fixed bottom-5 right-5 z-100">
      {open && (
        <div className="premium-surface mb-4 w-[calc(100vw-2.5rem)] max-w-md overflow-hidden rounded-xl text-white ring-1 ring-white/5">
          <div className="flex items-center justify-between border-b border-white/10 bg-white/4 px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="rounded-lg border border-red-500/20 bg-red-500/12 p-2 text-red-300 shadow-[0_0_28px_rgba(220,38,38,0.12)]">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-sm font-bold">KinOrbia Assistant</h2>
                <p className="text-xs text-neutral-400">Movie picks for your mood</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="kin-focus rounded-full p-2 text-neutral-400 transition hover:bg-white/10 hover:text-white"
              aria-label="Close assistant"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="max-h-[60vh] space-y-4 overflow-y-auto px-4 py-4">
            {messages.map((message, index) => (
              <div key={`${message.role}-${index}`} className={message.role === "user" ? "text-right" : "text-left"}>
                <div
                  className={`inline-block max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-relaxed ${
                    message.role === "user"
                      ? "bg-red-600 text-white shadow-[0_14px_32px_-22px_rgba(220,38,38,0.9)]"
                      : "border border-white/10 bg-white/8 text-neutral-100"
                  }`}
                >
                  {message.content}
                </div>

                {message.movies && message.movies.length > 0 && (
                  <div className="mt-3 grid grid-cols-1 gap-2 text-left">
                    {message.movies.map((movie) => (
                      <div
                        key={`${normalizeMediaType(movie.mediaType)}-${movie.id}`}
                        className="rounded-lg border border-white/10 bg-black/25 p-2 transition hover:border-red-500/50 hover:bg-white/8"
                      >
                        <Link
                          href={movie.mediaType === "tv" ? `/tv/${movie.id}` : `/movie/${movie.id}`}
                          onClick={() => setOpen(false)}
                          className="flex gap-3"
                        >
                          <div className="relative h-20 w-14 shrink-0 overflow-hidden rounded-md bg-neutral-900">
                            {movie.poster_path ? (
                              <Image
                                src={`https://image.tmdb.org/t/p/w185${movie.poster_path}`}
                                alt={movie.title}
                                fill
                                sizes="56px"
                                className="object-cover"
                              />
                            ) : (
                              <div className="flex h-full items-center justify-center text-neutral-600">
                                <Film className="h-5 w-5" />
                              </div>
                            )}
                          </div>
                          <div className="min-w-0 py-1">
                            <p className="truncate text-sm font-bold text-white">{movie.title}</p>
                            <p className="mt-1 text-xs text-neutral-500">
                              {movieYear(movie)} - TMDB {movie.vote_average?.toFixed?.(1) || "N/A"}
                            </p>
                          </div>
                        </Link>
                        <AssistantMovieActions movie={movie} lists={lists} />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex items-center gap-2 text-sm text-neutral-400">
                <Loader2 className="h-4 w-4 animate-spin text-red-400" />
                Thinking through the watchlist...
              </div>
            )}
          </div>

          <div className="border-t border-white/10 p-4">
            <div className="mb-3 flex gap-2 overflow-x-auto pb-1 hide-scrollbar">
              {STARTERS.map((starter) => (
                <button
                  key={starter}
                  type="button"
                  onClick={() => sendMessage(starter)}
                  className="kin-focus shrink-0 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-neutral-300 transition hover:border-red-500/50 hover:bg-red-500/10 hover:text-white"
                >
                  {starter}
                </button>
              ))}
            </div>

            <form onSubmit={handleSubmit} className="flex gap-2">
              <input
                ref={inputRef}
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="What do you want to watch?"
                className="kin-focus min-w-0 flex-1 rounded-lg border border-white/10 bg-black/30 px-4 py-3 text-sm text-white placeholder:text-neutral-500 focus:border-red-500/60"
              />
              <button
                type="submit"
                disabled={loading}
                className="kin-focus rounded-lg bg-red-600 px-4 text-white transition hover:bg-red-500 disabled:opacity-60"
                aria-label="Send message"
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <Send className="h-5 w-5" />}
              </button>
            </form>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => {
          setOpen((value) => !value);
          window.setTimeout(() => inputRef.current?.focus(), 50);
        }}
        className="kin-focus ml-auto flex h-14 w-14 items-center justify-center rounded-full border border-white/15 bg-red-600/90 text-white shadow-[0_24px_55px_-24px_rgba(220,38,38,0.9)] backdrop-blur-xl transition hover:scale-105 hover:bg-red-500"
        aria-label="Open movie assistant"
      >
        {open ? <X className="h-6 w-6" /> : <Bot className="h-6 w-6" />}
      </button>
    </div>
  );
}
