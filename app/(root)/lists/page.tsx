import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronDown, Film, Plus } from "lucide-react";
import { auth } from "@/auth";
import ActionForm from "@/components/ActionForm";
import EmptyState from "@/components/EmptyState";
import FormPanel from "@/components/FormPanel";
import MoviePicker from "@/components/MoviePicker";
import PageContainer from "@/components/PageContainer";
import PageHeader from "@/components/PageHeader";
import SectionHeader from "@/components/SectionHeader";
import SocialActionButton from "@/components/SocialActionButton";
import SubmitButton from "@/components/SubmitButton";
import TmdbPosterImage from "@/components/TmdbPosterImage";
import VisibilityBadge from "@/components/VisibilityBadge";
import { MAX_LIST_MOVIES } from "@/lib/bounds";
import dbConnect from "@/lib/dbConnect";
import { mediaKey, normalizeMediaType, tmdbImage } from "@/lib/media";
import { serializeList, type RawMovieList } from "@/lib/serialize";
import MovieList from "@/models/MovieList";
import User from "@/models/User";
import type { FavoriteMovie, ListMovie, MovieListItem } from "@/types";
import { createMovieList, deleteMovieList, updateMovieList } from "./actions";

export const metadata: Metadata = {
  title: "Lists",
  description: "Create and organize custom lists for movies and shows.",
};

function formatListDate(value: string) {
  return new Date(value).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

function PosterPreview({ movie }: { movie: ListMovie }) {
  const poster = tmdbImage(movie.posterPath, "w185");
  const href = normalizeMediaType(movie.mediaType) === "tv" ? `/tv/${movie.movieId}` : `/movie/${movie.movieId}`;

  return (
    <Link
      href={href}
      className="kin-focus group relative aspect-2/3 overflow-hidden rounded-control border border-rule bg-surface-raised transition-colors hover:border-highlight/40"
      aria-label={`Open ${movie.title}`}
    >
      {poster ? (
        <TmdbPosterImage
          src={poster}
          alt={movie.title}
          fill
          sizes="(min-width: 1024px) 64px, (min-width: 640px) 72px, 30vw"
          className="object-cover transition-opacity group-hover:opacity-85"
        />
      ) : (
        <span className="flex h-full items-center justify-center text-content-subtle">
          <Film className="h-5 w-5" aria-hidden="true" />
        </span>
      )}
    </Link>
  );
}

function ListRow({
  list,
  favorites,
  currentUserEmail,
}: {
  list: MovieListItem;
  favorites: FavoriteMovie[];
  currentUserEmail: string;
}) {
  const previews = list.movies.slice(0, 5);
  const isOwner = list.userEmail.toLowerCase() === currentUserEmail;
  const defaultSelected = list.movies.map((movie) => mediaKey(movie.mediaType, movie.movieId));
  const countLabel = `${list.movies.length} ${list.movies.length === 1 ? "title" : "titles"}`;

  return (
    <article className="kin-editorial-row flex-col gap-5 py-5 sm:flex-row sm:justify-between">
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <VisibilityBadge visibility={list.visibility} />
          <span className="text-xs text-content-subtle">{countLabel}</span>
        </div>
        <h3 className="mt-2 font-display text-xl font-medium leading-tight text-content">
          <Link
            href={`/lists/${list._id}`}
            className="kin-focus rounded-sm break-words [overflow-wrap:anywhere] transition-colors hover:text-highlight"
          >
            {list.title}
          </Link>
        </h3>
        <p className="mt-1.5 text-xs text-content-subtle">
          By {list.userName} · {formatListDate(list.createdAt)}
        </p>
        {list.description && (
          <p className="mt-3 line-clamp-2 text-sm leading-6 text-content-muted">
            {list.description}
          </p>
        )}
        {list.visibility === "public" && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <SocialActionButton
              type="list"
              id={list._id}
              action="like"
              count={list.likedBy?.length || 0}
              active={Boolean(list.likedBy?.includes(currentUserEmail))}
              path="/lists"
            />
            <SocialActionButton
              type="list"
              id={list._id}
              action="save"
              count={list.savedBy?.length || 0}
              active={Boolean(list.savedBy?.includes(currentUserEmail))}
              path="/lists"
            />
          </div>
        )}
        {isOwner && (
          <details className="group mt-4 border-t border-rule pt-4">
            <summary className="kin-focus inline-flex cursor-pointer list-none items-center gap-1.5 rounded-sm text-xs font-semibold uppercase tracking-[0.12em] text-content-muted transition-colors hover:text-content [&::-webkit-details-marker]:hidden">
              Manage list
              <ChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-180" aria-hidden="true" />
            </summary>
            <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_10rem] lg:items-start">
              <div>
                <ActionForm
                  action={updateMovieList}
                  className="kin-form-stack"
                  successMessage="List updated."
                >
                  <input type="hidden" name="listId" value={list._id} />
                  <div className="kin-field">
                    <label htmlFor={`list-title-${list._id}`} className="kin-label">
                      List title
                    </label>
                    <input
                      id={`list-title-${list._id}`}
                      name="title"
                      required
                      maxLength={80}
                      defaultValue={list.title}
                      className="kin-input"
                    />
                  </div>
                  <div className="kin-field">
                    <label htmlFor={`list-description-${list._id}`} className="kin-label">
                      Description
                    </label>
                    <textarea
                      id={`list-description-${list._id}`}
                      name="description"
                      maxLength={300}
                      rows={3}
                      defaultValue={list.description || ""}
                      className="kin-input resize-y"
                    />
                  </div>
                  <MoviePicker
                    name="movieIds"
                    favorites={favorites}
                    defaultSelected={defaultSelected}
                    max={MAX_LIST_MOVIES}
                    label="List titles"
                    emptyMessage="No favorites are available. Existing titles will be preserved when you save."
                  />
                  <p className="text-xs leading-5 text-content-subtle">
                    Titles no longer in your favorites remain selected and are preserved on save.
                  </p>
                  <fieldset>
                    <legend className="kin-label mb-1.5">Visibility</legend>
                    <div className="kin-choice-group">
                      <label className="kin-choice">
                        <input
                          type="radio"
                          name="visibility"
                          value="public"
                          defaultChecked={list.visibility === "public"}
                        />
                        Public
                      </label>
                      <label className="kin-choice">
                        <input
                          type="radio"
                          name="visibility"
                          value="private"
                          defaultChecked={list.visibility === "private"}
                        />
                        Private
                      </label>
                    </div>
                  </fieldset>
                  <SubmitButton pendingLabel="Saving..." variant="secondary">
                    Save list
                  </SubmitButton>
                </ActionForm>
              </div>
              <div className="border-t border-rule pt-4 lg:border-l lg:border-t-0 lg:pl-4 lg:pt-0">
                <p className="mb-2 text-xs leading-5 text-content-subtle">Deleting also removes its discussion and notifications.</p>
                <ActionForm action={deleteMovieList} successMessage="List deleted.">
                  <input type="hidden" name="listId" value={list._id} />
                  <SubmitButton
                    pendingLabel="Deleting..."
                    variant="danger"
                    confirmText={`Delete “${list.title}”? This cannot be undone.`}
                    className="w-full"
                  >
                    Delete list
                  </SubmitButton>
                </ActionForm>
              </div>
            </div>
          </details>
        )}
      </div>

      <div className="w-full shrink-0 sm:w-72 lg:w-80">
        {previews.length > 0 ? (
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-5">
            {previews.map((movie) => (
              <PosterPreview key={mediaKey(movie.mediaType, movie.movieId)} movie={movie} />
            ))}
          </div>
        ) : (
          <div className="flex min-h-24 flex-col items-center justify-center gap-2 rounded-control border border-dashed border-rule text-content-subtle">
            <Film className="h-5 w-5" aria-hidden="true" />
            <span className="text-xs">No titles yet</span>
          </div>
        )}
        {list.movies.length > previews.length && (
          <p className="mt-2 text-right text-xs text-content-subtle">
            +{list.movies.length - previews.length} more
          </p>
        )}
      </div>
    </article>
  );
}

export default async function ListsPage() {
  const session = await auth();
  if (!session?.user?.email) {
    redirect("/login");
  }
  const currentUserEmail = session.user.email.toLowerCase();

  await dbConnect();

  const [rawLists, user] = await Promise.all([
    MovieList.find({
      $or: [
        { visibility: "public" },
        { visibility: { $exists: false } },
        { userEmail: currentUserEmail },
      ],
    })
      .sort({ createdAt: -1 })
      .limit(18)
      .lean<RawMovieList[]>(),
    User.findOne({ email: currentUserEmail }).lean<{
      favorites?: FavoriteMovie[];
    } | null>(),
  ]);
  const lists = rawLists.map(serializeList);
  const favorites = (user?.favorites || []) as FavoriteMovie[];

  return (
    <div className="pb-20 pt-6 sm:pt-8">
      <PageContainer width="page">
        <PageHeader
          eyebrow="Collections"
          title="Community Lists"
          description="Build themed shelves from your favorites, from comfort watches to sharp thrillers and date-night picks."
        />

        <div className="mt-7 grid items-start gap-8 xl:grid-cols-[22rem_minmax(0,1fr)]">
          <FormPanel
            id="create-list"
            eyebrow="New collection"
            title="Create a list"
            description="Choose from your favorites and set who can see it."
          >
            {favorites.length > 0 ? (
              <ActionForm
                action={createMovieList}
                className="kin-form-stack"
                successMessage="List created."
                resetOnSuccess
              >
                <div className="kin-field">
                  <label htmlFor="create-list-title" className="kin-label">
                    List title
                  </label>
                  <input
                    id="create-list-title"
                    name="title"
                    required
                    maxLength={80}
                    placeholder="Friday night thrillers"
                    className="kin-input"
                  />
                </div>
                <div className="kin-field">
                  <label htmlFor="create-list-description" className="kin-label">
                    Description
                  </label>
                  <textarea
                    id="create-list-description"
                    name="description"
                    maxLength={300}
                    rows={3}
                    placeholder="A short note about the vibe."
                    className="kin-input resize-y"
                  />
                </div>
                <MoviePicker
                  name="movieIds"
                  favorites={favorites}
                  max={MAX_LIST_MOVIES}
                  label="Select titles"
                />
                <fieldset>
                  <legend className="kin-label mb-1.5">Visibility</legend>
                  <div className="kin-choice-group">
                    <label className="kin-choice">
                      <input type="radio" name="visibility" value="public" defaultChecked />
                      Public
                    </label>
                    <label className="kin-choice">
                      <input type="radio" name="visibility" value="private" />
                      Private
                    </label>
                  </div>
                </fieldset>
                <SubmitButton pendingLabel="Creating..." className="w-full sm:w-auto">
                  <Plus className="h-4 w-4" aria-hidden="true" />
                  Create list
                </SubmitButton>
              </ActionForm>
            ) : (
              <EmptyState
                compact
                title="No favorites yet"
                description="Add movies and shows to your favorites before creating a list."
              >
                <Link href="/" className="kin-focus rounded-sm text-sm font-semibold text-highlight hover:text-highlight/80">
                  Browse titles
                </Link>
              </EmptyState>
            )}
          </FormPanel>

          <section aria-labelledby="lists-results-heading">
            <SectionHeader
              id="lists-results"
              eyebrow="Latest collections"
              title="Lists"
              description="Newest public lists and your private collections."
            />
            {lists.length > 0 ? (
              <div className="kin-editorial-list mt-1">
                {lists.map((list) => (
                  <ListRow
                    key={list._id}
                    list={list}
                    favorites={favorites}
                    currentUserEmail={currentUserEmail}
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                compact
                className="mt-4"
                title="No lists yet"
                description="Create the first collection from your favorites."
              />
            )}
          </section>
        </div>
      </PageContainer>
    </div>
  );
}
