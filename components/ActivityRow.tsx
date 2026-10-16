"use client";

import Link from "next/link";
import { Eye, List, Star } from "lucide-react";
import PosterImage from "@/components/PosterImage";
import SpoilerText from "@/components/SpoilerText";
import UserNameLink from "@/components/UserNameLink";
import { renderRichText } from "@/lib/renderRichText";
import { formatDate, starsLabel } from "@/lib/media";
import { lookupRating, usernameFor } from "@/lib/feedLookups";
import type { FeedKind } from "@/lib/feedTypes";

type Names = Record<string, string>;
type DisplayNames = Record<string, string>;
type Ratings = Record<string, Record<string, number>>;

type ActivityRowProps = {
  kind: FeedKind;
  id: string;
  date: string;
  data: Record<string, unknown>;
  usernames: Names;
  names: DisplayNames;
  ratingMaps: Ratings;
};

const str = (value: unknown) => (typeof value === "string" ? value : "");
const strOr = (value: unknown, fallback: string) => (typeof value === "string" ? value : fallback);

// One row of the activity feed, shared by the server-rendered first page and by the pages
// the client appends. Extracted because the two halves must not drift: when they do, a
// review written before a page load renders one way and one written after it renders
// another, and nobody notices until the stylesheet is compared.
export default function ActivityRow({ kind, id, date, data, usernames, names, ratingMaps }: ActivityRowProps) {
  const userEmail = str(data.userEmail);
  const username = usernameFor(usernames, userEmail);
  // A row may carry its author's name (reviews and lists do); a watch row cannot, because
  // usermovies holds the title rather than the author. So the display name is the row's own
  // when it has one, then the resolved one, and only then the handle -- printing "leo.kim"
  // where "Leo Kim" belongs is what this replaces.
  const displayName = str(data.userName) || names[userEmail.toLowerCase()] || username || "Someone";

  if (kind === "review") {
    const posterPath = str(data.posterPath) || undefined;
    const rating = lookupRating(ratingMaps, data as { userEmail: string; movieId?: string; mediaType?: never });
    const title = str(data.title);
    const body = str(data.body);
    const createdAt = new Date(strOr(data.createdAt, date));
    const spoiler = data.spoiler === true;

    return (
      <li
        className="kin-editorial-row gap-4 transition-colors hover:bg-surface/40 sm:gap-6"
      >
        <div className="relative h-24 w-16 shrink-0 overflow-hidden bg-surface-raised sm:h-32 sm:w-20 lg:h-40 lg:w-28">
          <PosterImage path={posterPath} width="w185" alt={title} sizes="64px" className="object-cover" />
        </div>
        <article className="min-w-0 flex-1">
          <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-xs text-content-subtle">
            <span className="font-semibold uppercase tracking-overline text-content-muted">
              <UserNameLink userName={displayName} username={username} />{" "}
              reviewed
            </span>
            <span aria-hidden="true">·</span>
            <time dateTime={createdAt.toISOString()}>{formatDate(createdAt)}</time>
            {rating > 0 && (
              <span className="inline-flex items-center gap-1 font-semibold text-highlight" aria-label={`${rating} out of 10`}>
                <Star className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
                {starsLabel(rating)} stars
              </span>
            )}
          </div>
          <h2 className="mt-2 break-words font-display text-xl font-medium leading-tight text-content">{title}</h2>
          {spoiler && (
            <span className="mt-2 inline-flex items-center border border-highlight/25 bg-highlight-soft px-2 py-1 text-overline font-medium uppercase tracking-overline text-highlight">
              Spoiler
            </span>
          )}
          <div className="mt-3 min-w-0 break-words">
            {spoiler ? (
              <SpoilerText text={body} />
            ) : (
              <div className="whitespace-pre-wrap break-words text-sm leading-6 text-content-muted">
                {renderRichText(body)}
              </div>
            )}
          </div>
        </article>
      </li>
    );
  }

  if (kind === "list") {
    const movies = Array.isArray(data.movies) ? (data.movies as { posterPath?: string }[]) : [];
    const posterPath = movies[0]?.posterPath;
    const title = str(data.title);
    const createdAt = new Date(strOr(data.createdAt, date));

    return (
      <li className="kin-editorial-row gap-4 transition-colors hover:bg-surface/40 sm:gap-6">
        <div className="relative h-24 w-16 shrink-0 overflow-hidden bg-surface-raised sm:h-32 sm:w-20 lg:h-40 lg:w-28">
          <PosterImage path={posterPath} width="w185" alt="" sizes="64px" className="object-cover" />
        </div>
        <div className="min-w-0 flex-1">
          {/* The byline sits outside the <Link>: an anchor inside an anchor is invalid HTML
              and unreachable by keyboard. The trade is that the byline is not part of the
              click target; the title and description are. */}
          <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-xs text-content-subtle">
            <span className="font-semibold uppercase tracking-overline text-content-muted">
              <UserNameLink userName={displayName} username={username} />{" "}
              created a list
            </span>
            <span aria-hidden="true">·</span>
            <time dateTime={createdAt.toISOString()}>{formatDate(createdAt)}</time>
          </div>
          <Link href={`/lists/${id}`} className="kin-focus group block py-0.5">
            <h2 className="mt-2 flex min-w-0 items-start gap-2 break-words font-display text-xl font-medium leading-tight text-content transition-colors group-hover:text-highlight">
              <List className="mt-1 h-4 w-4 shrink-0 text-highlight" aria-hidden="true" />
              <span className="min-w-0 break-words">{title}</span>
            </h2>
            {str(data.description) && (
              <p className="mt-2 whitespace-pre-wrap break-words text-sm leading-6 text-content-muted">
                {str(data.description)}
              </p>
            )}
          </Link>
        </div>
      </li>
    );
  }

  // A watch. No body, no description: the row is a poster, a title, and who watched it.
  // `userName` is absent on a usermovies row, so the resolved username is the only byline.
  const watchedAt = new Date(strOr(data.watchedAt, date));
  const title = str(data.title);

  return (
    <li className="kin-editorial-row gap-4 transition-colors hover:bg-surface/40 sm:gap-6">
      <div className="relative h-24 w-16 shrink-0 overflow-hidden bg-surface-raised sm:h-32 sm:w-20 lg:h-40 lg:w-28">
        <PosterImage
          path={str(data.posterPath) || undefined}
          width="w185"
          alt=""
          sizes="64px"
          className="object-cover"
        />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1 text-xs text-content-subtle">
          <span className="font-semibold uppercase tracking-overline text-content-muted">
            <UserNameLink userName={displayName} username={username} />{" "}
            watched
          </span>
          <span aria-hidden="true">·</span>
          <time dateTime={watchedAt.toISOString()}>{formatDate(watchedAt)}</time>
        </div>
        {/* An h2, matching the review and list rows. As a <p> the title of a feed item was
            not a heading, so it vanished from the document outline the other two build and
            the feed could not be navigated by heading. Same text-xl as its siblings. */}
        <h2 className="mt-2 flex min-w-0 items-center gap-2 break-words font-display text-xl font-medium leading-tight text-content">
          <Eye className="h-4 w-4 shrink-0 text-highlight" aria-hidden="true" />
          <span className="min-w-0 break-words">{title}</span>
        </h2>
      </div>
    </li>
  );
}