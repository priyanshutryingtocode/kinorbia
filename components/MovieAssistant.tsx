"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useRef, useState } from "react";
import { Bot, Film, Loader2, Send, Sparkles, X } from "lucide-react";
import type { MovieSummary } from "@/types";
import AssistantMovieActions from "./AssistantMovieActions";

type ChatMessage = {
  role: "user" | "assistant";
  content: string;
  movies?: MovieSummary[];
};

const STARTERS = [
  "Something cozy and funny tonight",
  "A tense thriller under 2 hours",
  "Movies like Dune but more emotional",
];

function movieYear(movie: MovieSummary) {
  return movie.release_date ? new Date(movie.release_date).getFullYear() : "N/A";
}

export default function MovieAssistant() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: "assistant",
      content: "Tell me the mood, genre, pace, or vibe you want. I will suggest a few movies.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const sendMessage = async (content: string) => {
    const trimmed = content.trim();
    if (!trimmed || loading) {
      return;
    }

    const nextMessages: ChatMessage[] = [...messages, { role: "user", content: trimmed }];
    setMessages(nextMessages);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/assistant/movie", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: nextMessages.map((message) => ({
            role: message.role,
            content: message.content,
          })),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessages([
          ...nextMessages,
          {
            role: "assistant",
            content: data.message || "I could not find recommendations right now.",
          },
        ]);
        return;
      }

      setMessages([
        ...nextMessages,
        {
          role: "assistant",
          content: data.reply || "Here are a few movies that fit.",
          movies: data.movies || [],
        },
      ]);
    } catch {
      setMessages([
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
        <div className="mb-4 w-[calc(100vw-2.5rem)] max-w-md overflow-hidden rounded-2xl border border-white/15 bg-neutral-950/75 text-white shadow-2xl shadow-black/60 backdrop-blur-2xl">
          <div className="flex items-center justify-between border-b border-white/10 bg-white/5 px-4 py-3">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-red-500/15 p-2 text-red-300">
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
              className="rounded-full p-2 text-neutral-400 transition hover:bg-white/10 hover:text-white"
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
                      ? "bg-red-600 text-white"
                      : "border border-white/10 bg-white/8 text-neutral-100"
                  }`}
                >
                  {message.content}
                </div>

                {message.movies && message.movies.length > 0 && (
                  <div className="mt-3 grid grid-cols-1 gap-2 text-left">
                    {message.movies.map((movie) => (
                      <div
                        key={movie.id}
                        className="rounded-xl border border-white/10 bg-black/25 p-2 transition hover:border-red-500/50 hover:bg-white/8"
                      >
                        <Link
                          href={`/movie/${movie.id}`}
                          onClick={() => setOpen(false)}
                          className="flex gap-3"
                        >
                          <div className="relative h-20 w-14 shrink-0 overflow-hidden rounded-lg bg-neutral-900">
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
                        <AssistantMovieActions movie={movie} />
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
                  className="shrink-0 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-neutral-300 transition hover:border-red-500/50 hover:text-white"
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
                className="min-w-0 flex-1 rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-white placeholder:text-neutral-500 focus:border-red-500/60 focus:outline-none"
              />
              <button
                type="submit"
                disabled={loading}
                className="rounded-xl bg-red-600 px-4 text-white transition hover:bg-red-500 disabled:opacity-60"
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
        className="ml-auto flex h-14 w-14 items-center justify-center rounded-full border border-white/15 bg-red-600/90 text-white shadow-2xl shadow-red-950/50 backdrop-blur-xl transition hover:scale-105 hover:bg-red-500"
        aria-label="Open movie assistant"
      >
        {open ? <X className="h-6 w-6" /> : <Bot className="h-6 w-6" />}
      </button>
    </div>
  );
}
