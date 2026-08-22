import Image from "next/image";
import { redirect } from "next/navigation";
import { BookOpen, CalendarDays } from "lucide-react";
import EmptyState from "@/components/EmptyState";
import type { Metadata } from "next";
import { auth } from "@/auth";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import JournalEntry from "@/models/JournalEntry";
import { dedupeFavorites } from "@/lib/reviewRatings";
import { createJournalEntry, deleteJournalEntry, updateJournalEntry } from "./actions";
import type { FavoriteMovie, JournalItem } from "@/types";
import SubmitButton from "@/components/SubmitButton";

type RawJournalEntry = Omit<JournalItem, "_id" | "createdAt" | "watchedAt"> & {
  _id: { toString: () => string };
  createdAt: Date;
  watchedAt: Date;
};

function serializeEntry(entry: RawJournalEntry): JournalItem {
  return {
    _id: entry._id.toString(),
    movieTitle: entry.movieTitle,
    posterPath: entry.posterPath,
    watchedAt: entry.watchedAt.toISOString(),
    note: entry.note,
    createdAt: entry.createdAt.toISOString(),
    movieId: entry.movieId,
    mediaType: entry.mediaType || "movie",
  };
}

function posterUrl(path?: string | null) {
  return path ? `https://image.tmdb.org/t/p/w185${path}` : null;
}

function todayInputValue() {
  return new Date().toISOString().slice(0, 10);
}

function dateInputValue(date: string) {
  return new Date(date).toISOString().slice(0, 10);
}

export const metadata: Metadata = {
  title: "Watch Journal",
  description: "Log what you watched, when you watched it, and the notes worth keeping.",
};

export default async function JournalPage() {
  const session = await auth();
  if (!session?.user?.email) {
    redirect("/login");
  }

  await dbConnect();
  const user = await User.findOne({ email: session.user.email });
  const favorites = dedupeFavorites((user?.favorites || []) as FavoriteMovie[]);
  const rawEntries = await JournalEntry.find({ userEmail: session.user.email })
    .sort({ watchedAt: -1, createdAt: -1 })
    .limit(40)
    .lean<RawJournalEntry[]>();
  const entries = rawEntries.map(serializeEntry);

  return (
    <div className="min-h-screen bg-neutral-950 text-white px-6 py-12">
      <div className="max-w-7xl mx-auto">
        <header className="mb-10">
          <p className="text-red-500 text-sm font-bold uppercase tracking-widest mb-3">
            Personal
          </p>
          <h1 className="text-4xl md:text-5xl font-bold">Watch Journal</h1>
          <p className="text-neutral-400 mt-3 max-w-2xl">
            Log what you watched, when you watched it, and the small notes that are easy to forget later.
          </p>
        </header>

        <section className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-8">
          <aside className="bg-neutral-900/50 border border-white/10 rounded-xl p-5 h-fit">
            <div className="flex items-center gap-3 mb-5">
              <div className="p-2 bg-red-500/10 rounded-lg">
                <BookOpen className="w-5 h-5 text-red-400" />
              </div>
              <h2 className="font-bold text-lg">Log a Watch</h2>
            </div>

            <form action={createJournalEntry} className="space-y-4">
              {favorites.length > 0 && (
                <div>
                  <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">
                    Pick from Favorites
                  </label>
                  <select
                    name="favoriteMovieId"
                    className="w-full bg-neutral-950 border border-white/10 rounded-lg px-3 py-3 text-sm text-white focus:outline-none focus:border-red-500"
                    defaultValue=""
                  >
                    <option value="">Manual movie title</option>
                    {favorites.map((movie) => (
                      <option key={`${movie.mediaType || "movie"}-${movie.movieId}`} value={`${movie.mediaType || "movie"}:${movie.movieId}`}>
                        {movie.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">
                  Movie Title
                </label>
                <input
                  name="movieTitle"
                  placeholder="For manual journal entries"
                  className="w-full bg-neutral-950 border border-white/10 rounded-lg px-3 py-3 text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">
                  Watched
                </label>
                <input
                  name="watchedAt"
                  type="date"
                  required
                  defaultValue={todayInputValue()}
                  className="w-full bg-neutral-950 border border-white/10 rounded-lg px-3 py-3 text-sm text-white focus:outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">
                  Note
                </label>
                <textarea
                  name="note"
                  maxLength={1000}
                  rows={5}
                  placeholder="A scene, mood, or thought to remember."
                  className="w-full bg-neutral-950 border border-white/10 rounded-lg px-3 py-3 text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-red-500 resize-none"
                />
              </div>

              <SubmitButton pendingLabel="Adding..." className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-3 rounded-lg transition">
                Add to Journal
              </SubmitButton>
            </form>
          </aside>

          <div className="space-y-4">
            {entries.length > 0 ? (
              entries.map((entry) => (
                <article
                  key={entry._id}
                  className="bg-neutral-900/50 border border-white/10 rounded-xl p-4 flex gap-4"
                >
                  <div className="relative w-20 sm:w-24 aspect-2/3 bg-neutral-950 rounded-lg overflow-hidden shrink-0">
                    {posterUrl(entry.posterPath) ? (
                      <Image
                        src={posterUrl(entry.posterPath) as string}
                        alt={entry.movieTitle}
                        fill
                        sizes="96px"
                        className="object-cover"
                      />
                    ) : (
                      <div className="h-full flex items-center justify-center text-neutral-700">
                        <BookOpen className="w-6 h-6" />
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-3 text-xs text-neutral-500 mb-2">
                      <span className="flex items-center gap-1">
                        <CalendarDays className="w-3.5 h-3.5" />
                        {new Date(entry.watchedAt).toLocaleDateString(undefined, { timeZone: "UTC" })}
                      </span>
                    </div>
                    <h3 className="text-lg font-bold text-white">{entry.movieTitle}</h3>
                    {entry.note && (
                      <p className="text-sm text-neutral-300 leading-relaxed mt-3">{entry.note}</p>
                    )}
                    <details className="mt-4 border-t border-white/10 pt-4">
                      <summary className="cursor-pointer text-xs font-bold uppercase tracking-wider text-neutral-400 hover:text-white">
                        Manage
                      </summary>
                      <form action={updateJournalEntry} className="mt-4 space-y-3">
                        <input type="hidden" name="entryId" value={entry._id} />
                        <input
                          name="watchedAt"
                          type="date"
                          required
                          defaultValue={dateInputValue(entry.watchedAt)}
                          className="w-full bg-neutral-950 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500"
                        />
                        <textarea
                          name="note"
                          maxLength={1000}
                          rows={3}
                          defaultValue={entry.note}
                          className="w-full bg-neutral-950 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500 resize-none"
                        />
                        <SubmitButton pendingLabel="Saving..." className="w-full bg-white/10 hover:bg-white/15 text-white font-bold py-2 rounded-lg transition">
                          Save Entry
                        </SubmitButton>
                      </form>
                      <form action={deleteJournalEntry} className="mt-2">
                        <input type="hidden" name="entryId" value={entry._id} />
                        <SubmitButton pendingLabel="Deleting..." className="w-full border border-red-500/30 text-red-300 hover:bg-red-500/10 font-bold py-2 rounded-lg transition">
                          Delete Entry
                        </SubmitButton>
                      </form>
                    </details>
                  </div>
                </article>
              ))
            ) : (
              <EmptyState
                title="Your journal is empty"
                description="Log your first watch to start building your watch history."
              />
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
