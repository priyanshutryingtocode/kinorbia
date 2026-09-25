import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Film } from "lucide-react";
import { requireUserEmail } from "@/lib/actions";
import CommentSection from "@/components/CommentSection";
import EmptyState from "@/components/EmptyState";
import RouteShell from "@/components/RouteShell";
import PageHeader from "@/components/PageHeader";
import SectionHeader from "@/components/SectionHeader";
import SocialActionButton from "@/components/SocialActionButton";
import TmdbPosterImage from "@/components/TmdbPosterImage";
import VisibilityBadge from "@/components/VisibilityBadge";
import dbConnect from "@/lib/dbConnect";
import { formatDate, mediaHref, mediaKey, normalizeMediaType, tmdbImage } from "@/lib/media";
import { isObjectId } from "@/lib/objectId";
import { serializeList, type RawMovieList } from "@/lib/serialize";
import MovieList from "@/models/MovieList";
import type { ListMovie } from "@/types";

export const metadata: Metadata = {
  title: "List",
  description: "A curated KinOrbia movie and series list.",
};

type ListDetailPageProps = {
  params: Promise<{ id: string }> | { id: string };
};

function ListPoster({ movie }: { movie: ListMovie }) {
  const poster = tmdbImage(movie.posterPath, "w342");
  const mediaType = normalizeMediaType(movie.mediaType);
  const href = mediaHref(mediaType, movie.movieId);
  const year = movie.releaseDate?.slice(0, 4) || "Year unknown";

  return (
    <Link
      href={href}
      className="kin-focus group overflow-hidden rounded-control border border-rule bg-surface-raised transition-colors hover:border-highlight/40"
    >
      <div className="relative aspect-2/3 overflow-hidden bg-surface">
        {poster ? (
          <TmdbPosterImage
            src={poster}
            alt={movie.title}
            fill
            sizes="(min-width: 1536px) 16vw, (min-width: 1280px) 18vw, (min-width: 768px) 25vw, 45vw"
            className="object-cover transition-opacity group-hover:opacity-85"
          />
        ) : (
          <span className="flex h-full items-center justify-center text-content-subtle">
            <Film className="h-7 w-7" aria-hidden="true" />
          </span>
        )}
      </div>
      <div className="p-2.5">
        <h3 className="break-words text-sm font-medium leading-5 text-content [overflow-wrap:anywhere] transition-colors group-hover:text-highlight">
          {movie.title}
        </h3>
        <p className="mt-1 text-xs text-content-subtle">
          {mediaType === "tv" ? "Series" : "Movie"} · {year}
        </p>
      </div>
    </Link>
  );
}

export default async function ListDetailPage({ params }: ListDetailPageProps) {
  const currentUserEmail = await requireUserEmail();

  const { id } = await Promise.resolve(params);
  if (!isObjectId(id)) {
    notFound();
  }

  await dbConnect();
  const rawList = await MovieList.findOne({
    _id: id,
    $or: [
      { visibility: "public" },
      { visibility: { $exists: false } },
      { userEmail: currentUserEmail },
    ],
  }).lean<RawMovieList | null>();

  if (!rawList) {
    notFound();
  }

  const list = serializeList(rawList);
  const countLabel = `${list.movies.length} ${list.movies.length === 1 ? "title" : "titles"}`;

  return (
    <RouteShell spacing="extended" width="page">
      <Link
        href="/lists"
        className="kin-focus inline-flex items-center gap-1.5 rounded-sm text-sm font-medium text-content-muted transition-colors hover:text-content"
      >
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        Back to lists
      </Link>
      <PageHeader
        className="mt-6 [&_h1]:[overflow-wrap:anywhere]"
        eyebrow="Collection"
        title={list.title}
        description={
          <>
            <p>
              By {list.userName} · {formatDate(list.createdAt)} · {countLabel}
            </p>
            {list.description && (
              <p className="mt-2 max-w-3xl break-words [overflow-wrap:anywhere]">
                {list.description}
              </p>
            )}
          </>
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <VisibilityBadge visibility={list.visibility} />
            {list.visibility === "public" && (
              <>
                <SocialActionButton
                  type="list"
                  id={list._id}
                  action="like"
                  count={list.likedBy?.length || 0}
                  active={Boolean(list.likedBy?.includes(currentUserEmail))}
                  path={`/lists/${list._id}`}
                />
                <SocialActionButton
                  type="list"
                  id={list._id}
                  action="save"
                  count={list.savedBy?.length || 0}
                  active={Boolean(list.savedBy?.includes(currentUserEmail))}
                  path={`/lists/${list._id}`}
                />
              </>
            )}
          </div>
        }
      />

      <div className="mt-8">
        <SectionHeader
          id="list-titles"
          eyebrow="Selection"
          title={countLabel}
          description="Every film and series in this collection."
        />
        {list.movies.length > 0 ? (
          <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
            {list.movies.map((movie) => (
              <ListPoster key={mediaKey(movie.mediaType, movie.movieId)} movie={movie} />
            ))}
          </div>
        ) : (
          <EmptyState
            compact
            className="mt-4"
            title="This list has no titles yet"
            description="The owner can add movies and series from their favorites."
          />
        )}
      </div>

      {list.visibility === "public" && (
        <div className="mt-12">
          <SectionHeader
            id="list-discussion"
            eyebrow="Community"
            title="Discussion"
            description="Join the conversation about this collection."
          />
          <CommentSection parentType="list" parentId={list._id} path={`/lists/${list._id}`} />
        </div>
      )}
    </RouteShell>
  );
}
