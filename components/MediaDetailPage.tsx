import Image from "next/image";
import { Suspense } from "react";
import { Calendar, Clapperboard, Clock, Film, Layers, Star } from "lucide-react";
import FavoriteButton from "@/components/FavouriteButton";
import WatchedButton from "@/components/WatchedButton";
import WatchlistButton from "@/components/WatchlistButton";
import MovieRatingControl from "@/components/MovieRatingControl";
import TmdbPosterImage from "@/components/TmdbPosterImage";
import TrailerButton from "@/components/TrailerButton";
import PageContainer from "@/components/PageContainer";
import SimilarMedia from "@/components/SimilarMedia";
import MovieReviewsAndLists from "@/components/MovieReviewsAndLists";
import { tmdbImage } from "@/lib/media";
import type { DetailChip, DetailIcon, DetailModel } from "@/lib/mediaDetail";

// The one detail layout, shared by /movie/[id] and /tv/[id]. Everything that
// differs between a film and a show arrives already resolved on the model, so
// this file is markup only and the two route files are thin adapters.

const CHIP_CLASS =
  "flex items-center gap-2 rounded-full border border-rule bg-black/30 px-3 py-1.5 backdrop-blur-md";
const ACCENT_CHIP_CLASS =
  "flex items-center gap-2 rounded-full border border-highlight/20 bg-highlight/10 px-3 py-1.5 text-highlight";

const ICONS: Record<DetailIcon, typeof Star> = {
  star: Star,
  "star-filled": Star,
  calendar: Calendar,
  clock: Clock,
  layers: Layers,
};

function Chip({ chip }: { chip: DetailChip }) {
  const Icon = ICONS[chip.icon];
  // The accent chip is the viewer's own rating, so its star is filled from the
  // current text colour rather than the highlight gold used for TMDB's score.
  const iconClass = chip.accent
    ? "h-4 w-4 fill-current"
    : chip.icon === "star-filled"
      ? "h-4 w-4 fill-highlight text-highlight"
      : "h-4 w-4 text-content-muted";

  return (
    <div className={chip.accent ? ACCENT_CHIP_CLASS : CHIP_CLASS}>
      <Icon className={iconClass} />
      <span>{chip.label}</span>
    </div>
  );
}

export default async function MediaDetailPage({
  model,
  personal,
}: {
  model: DetailModel;
  personal: {
    isFavorite: boolean;
    personalRating: number;
    isWatchlisted: boolean;
    isWatched: boolean;
  };
}) {
  const { summary } = model;
  const backdrop = tmdbImage(model.backdropPath, "w1280");
  const poster = tmdbImage(model.posterPath, "w500");
  const FallbackIcon = model.mediaType === "tv" ? Clapperboard : Film;

  return (
    <div className="relative overflow-hidden pb-20 text-content">
      <div className="absolute inset-x-0 top-0 h-[55svh] opacity-50 sm:h-[70svh] lg:h-svh">
        {backdrop && (
          <TmdbPosterImage
            src={backdrop}
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
        )}
        <div className="absolute inset-0 bg-linear-to-t from-canvas via-canvas/70 to-canvas/20" />
        <div className="film-grain absolute inset-0" aria-hidden />
      </div>

      <PageContainer width="frame" className="relative pt-28 sm:pt-32">
        <div className="relative grid gap-8 lg:grid-cols-[minmax(260px,360px)_1fr] lg:gap-12">
          <div className="mx-auto w-full max-w-67.5 sm:max-w-82.5 lg:max-w-none">
            {poster ? (
              <TmdbPosterImage
                src={poster}
                alt={model.title}
                width={320}
                height={480}
                priority
                className="aspect-2/3 w-full rotate-1 rounded-sheet border border-rule object-cover shadow-[0_28px_80px_-44px_rgba(0,0,0,0.95)] transition-transform duration-500 hover:rotate-0"
              />
            ) : (
              <div className="flex aspect-2/3 w-full rotate-1 items-center justify-center rounded-sheet border border-rule bg-surface-raised shadow-[0_28px_80px_-44px_rgba(0,0,0,0.95)] transition-transform duration-500 hover:rotate-0">
                <FallbackIcon className="h-10 w-10 text-neutral-700" />
              </div>
            )}
          </div>

          <div className="min-w-0">
            <p className="mb-3 text-xs font-bold uppercase tracking-overline text-gold">
              {model.releaseYear} <span className="mx-2 text-content/20">—</span>{" "}
              {model.kindLabel}
            </p>
            <h1 className="font-display max-w-3xl text-4xl font-medium leading-editorial text-content sm:text-5xl">
              {model.title}
            </h1>
            {model.tagline && (
              <p className="font-display mt-3 max-w-2xl text-base italic leading-7 text-content sm:text-lg">
                “{model.tagline}”
              </p>
            )}

            <div className="mt-6 flex flex-wrap items-center gap-2 text-sm font-medium text-content">
              {model.chips.map((chip) => (
                <Chip key={chip.key} chip={chip} />
              ))}
            </div>

            <div className="mt-8 rounded-sheet border border-rule bg-canvas/70 p-4 backdrop-blur-xl sm:p-5">
              <div className="flex flex-wrap items-center gap-3">
                {model.trailerKey && (
                  <TrailerButton videoKey={model.trailerKey} title={model.title} />
                )}
                <FavoriteButton movie={summary} initialIsFavorite={personal.isFavorite} />
                <WatchedButton movie={summary} initialIsWatched={personal.isWatched} />
                <WatchlistButton movie={summary} initialIsWatchlisted={personal.isWatchlisted} />
                <div className="mt-3 w-full sm:mt-0 sm:w-auto sm:flex-1 sm:min-w-0">
                  <MovieRatingControl
                    movie={summary}
                    initialRating={personal.personalRating}
                    isWatched={personal.isWatched}
                  />
                </div>
              </div>
            </div>

            <p className="mt-6 max-w-3xl text-base leading-relaxed text-content sm:text-lg">
              {model.overview}
            </p>

            {model.crew.length > 0 && (
              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                {model.crew.map((panel) => (
                  <div key={panel.label} className="rounded-sheet border border-rule bg-surface-raised/50 p-4">
                    <h3 className="mb-2 text-xs font-bold uppercase tracking-widest text-content-subtle">
                      {panel.label}
                    </h3>
                    <p className="text-base font-semibold text-content">{panel.names}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {model.cast.length > 0 && (
          <section className="mt-14 border-t border-rule pt-8">
            <h2 className="font-display mb-5 text-2xl font-medium">Top Cast</h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
              {model.cast.map((member) => (
                <div key={member.id} className="rounded-sheet border border-rule bg-surface-raised/50 p-3 text-center">
                  {member.profile_path ? (
                    <Image
                      src={`https://image.tmdb.org/t/p/w185${member.profile_path}`}
                      alt={member.name}
                      unoptimized
                      width={120}
                      height={120}
                      className="mx-auto aspect-square rounded-full object-cover"
                    />
                  ) : (
                    <div className="mx-auto flex aspect-square w-30 items-center justify-center rounded-full bg-surface-raised">
                      <span className="text-3xl font-bold text-content-subtle">
                        {member.name.trim().charAt(0).toUpperCase()}
                      </span>
                    </div>
                  )}
                  <p className="mt-3 text-sm font-semibold text-content">{member.name}</p>
                  <p className="mt-1 text-xs text-content-muted">{member.character || "—"}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        <Suspense fallback={null}>
          <MovieReviewsAndLists movieId={model.id} mediaType={model.mediaType} />
        </Suspense>

        <Suspense fallback={null}>
          <SimilarMedia id={model.id} mediaType={model.mediaType} />
        </Suspense>
      </PageContainer>
    </div>
  );
}
