import { redirect } from "next/navigation";
import { BookOpen, CalendarDays } from "lucide-react";
import type { Metadata } from "next";
import { auth } from "@/auth";
import ActionForm from "@/components/ActionForm";
import EmptyState from "@/components/EmptyState";
import FormPanel from "@/components/FormPanel";
import PageContainer from "@/components/PageContainer";
import PageHeader from "@/components/PageHeader";
import SectionHeader from "@/components/SectionHeader";
import SubmitButton from "@/components/SubmitButton";
import TmdbPosterImage from "@/components/TmdbPosterImage";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import JournalEntry from "@/models/JournalEntry";
import { dedupeFavorites } from "@/lib/reviewRatings";
import { serializeJournalEntry, type RawJournalEntry } from "@/lib/serialize";
import { mediaKey, tmdbImage } from "@/lib/media";
import { createJournalEntry, deleteJournalEntry, updateJournalEntry } from "./actions";
import type { FavoriteMovie, JournalItem } from "@/types";

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

function JournalEntryRow({ entry }: { entry: JournalItem }) {
  const poster = tmdbImage(entry.posterPath, "w185");
  const watchedAtId = `journal-watched-${entry._id}`;
  const noteId = `journal-note-${entry._id}`;

  return (
    <article className="kin-editorial-row">
      <div className="relative aspect-2/3 w-16 shrink-0 overflow-hidden rounded-control bg-surface-raised sm:w-20">
        {poster ? (
          <TmdbPosterImage
            src={poster}
            alt={entry.movieTitle}
            fill
            sizes="(min-width: 640px) 80px, 64px"
            className="object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center text-content-subtle">
            <BookOpen className="h-6 w-6" aria-hidden="true" />
          </div>
        )}
      </div>

      <div className="min-w-0 flex-1">
        <time
          dateTime={entry.watchedAt}
          className="inline-flex items-center gap-1.5 text-overline font-medium uppercase tracking-overline text-content-subtle"
        >
          <CalendarDays className="h-3.5 w-3.5" aria-hidden="true" />
          {new Date(entry.watchedAt).toLocaleDateString(undefined, { timeZone: "UTC" })}
        </time>
        <h3 className="mt-1 break-words font-display text-lg font-medium leading-tight text-content [overflow-wrap:anywhere]">{entry.movieTitle}</h3>
        {entry.note && <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-content-muted [overflow-wrap:anywhere]">{entry.note}</p>}

        <details className="mt-4 border-t border-rule pt-3">
          <summary className="kin-focus w-fit cursor-pointer rounded-control text-overline font-medium uppercase tracking-overline text-content-muted transition-colors hover:text-highlight">
            Manage entry
          </summary>
          <ActionForm action={updateJournalEntry} successMessage="Journal entry updated." className="kin-form-stack mt-3">
            <input type="hidden" name="entryId" value={entry._id} />
            <div className="kin-field">
              <label htmlFor={watchedAtId} className="kin-label">
                Watched
              </label>
              <input
                id={watchedAtId}
                name="watchedAt"
                type="date"
                required
                defaultValue={dateInputValue(entry.watchedAt)}
                className="kin-input"
              />
            </div>
            <div className="kin-field">
              <label htmlFor={noteId} className="kin-label">
                Note
              </label>
              <textarea
                id={noteId}
                name="note"
                maxLength={1000}
                rows={3}
                defaultValue={entry.note}
                className="kin-input resize-y"
              />
            </div>
            <SubmitButton pendingLabel="Saving..." variant="secondary" className="w-full sm:w-auto">
              Save entry
            </SubmitButton>
          </ActionForm>
          <ActionForm action={deleteJournalEntry} successMessage="Journal entry deleted." className="mt-3">
            <input type="hidden" name="entryId" value={entry._id} />
            <SubmitButton
              pendingLabel="Deleting..."
              variant="danger"
              confirmText="Delete this journal entry?"
              className="w-full sm:w-auto"
            >
              Delete entry
            </SubmitButton>
          </ActionForm>
        </details>
      </div>
    </article>
  );
}

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
  const entries = rawEntries.map(serializeJournalEntry);

  const favoriteMovieId = "journal-favorite-movie";
  const movieTitleId = "journal-movie-title";
  const watchedAtId = "journal-watched-at";
  const noteId = "journal-note";

  return (
    <div className="bg-canvas pb-16 pt-6 sm:pt-8">
      <PageContainer width="page">
        <PageHeader
          eyebrow="Personal"
          title="Watch Journal"
          description="Log what you watched, when you watched it, and the small notes that are easy to forget later."
        />

        <div className="mt-8 grid items-start gap-8 lg:grid-cols-[minmax(0,20rem)_minmax(0,1fr)]">
          <FormPanel
            id="log-watch"
            eyebrow="New entry"
            title="Log a watch"
            description="Choose a favorite or add a title manually."
            className="lg:sticky lg:top-24"
          >
            <ActionForm action={createJournalEntry} successMessage="Journal entry added." resetOnSuccess className="kin-form-stack">
              {favorites.length > 0 && (
                <div className="kin-field">
                  <label htmlFor={favoriteMovieId} className="kin-label">
                    Pick from favorites
                  </label>
                  <select id={favoriteMovieId} name="favoriteMovieId" defaultValue="" className="kin-input">
                    <option value="">Manual movie title</option>
                    {favorites.map((movie) => (
                      <option key={mediaKey(movie.mediaType, movie.movieId)} value={mediaKey(movie.mediaType, movie.movieId)}>
                        {movie.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="kin-field">
                <label htmlFor={movieTitleId} className="kin-label">
                  Movie title
                </label>
                <input
                  id={movieTitleId}
                  name="movieTitle"
                  maxLength={200}
                  placeholder="For manual journal entries"
                  className="kin-input"
                />
              </div>

              <div className="kin-field">
                <label htmlFor={watchedAtId} className="kin-label">
                  Watched
                </label>
                <input
                  id={watchedAtId}
                  name="watchedAt"
                  type="date"
                  required
                  defaultValue={todayInputValue()}
                  className="kin-input"
                />
              </div>

              <div className="kin-field">
                <label htmlFor={noteId} className="kin-label">
                  Note
                </label>
                <textarea
                  id={noteId}
                  name="note"
                  maxLength={1000}
                  rows={5}
                  placeholder="A scene, mood, or thought to remember."
                  className="kin-input resize-y"
                />
              </div>

              <SubmitButton pendingLabel="Adding..." variant="primary" className="w-full">
                Add to journal
              </SubmitButton>
            </ActionForm>
          </FormPanel>

          <section aria-labelledby="journal-entries-heading">
            <SectionHeader
              id="journal-entries"
              eyebrow="Watch log"
              title="Recent entries"
              description={entries.length > 0 ? `${entries.length} logged ${entries.length === 1 ? "watch" : "watches"}` : "Your watch history, one entry at a time"}
            />
            <div className="mt-5">
              {entries.length > 0 ? (
                <div className="kin-editorial-list">
                  {entries.map((entry) => (
                    <JournalEntryRow key={entry._id} entry={entry} />
                  ))}
                </div>
              ) : (
                <EmptyState
                  compact
                  title="Your journal is empty"
                  description="Log your first watch to start building your watch history."
                />
              )}
            </div>
          </section>
        </div>
      </PageContainer>
    </div>
  );
}
