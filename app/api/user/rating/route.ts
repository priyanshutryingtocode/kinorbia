import { NextResponse } from "next/server";
import User from "@/models/User";
import JournalEntry from "@/models/JournalEntry";
import { withAuthedUser } from "@/lib/session";
import { rateMovieSchema, parseMovieBody, badRequest } from "@/lib/validators";
import { MAX_FAVORITES } from "@/lib/bounds";
import { mediaEquals } from "@/lib/media";

export const POST = withAuthedUser(
  async (req, { email }) => {
    const body = await parseMovieBody(req, rateMovieSchema);
    if (!body) {
      return badRequest("Movie and rating are required.");
    }

    const normalizedMovieId = body.movieId;
    const clampedRating = body.rating;
    const normalizedMediaType = body.mediaType;

    // A rating is a judgement about something you watched, so the diary gates
    // it rather than being written as a side effect of it. This used to run
    // the other way round: rating a title inserted a journal row stamped with
    // the current time, which meant you could "watch" a film just by rating it
    // and the row carried no note and no confirmation.
    //
    // The invariant is unchanged, only its direction. Every already-rated title
    // has a diary row precisely because this handler used to create one, so no
    // existing user is locked out by flipping the dependency.
    const watched = await JournalEntry.exists({
      userEmail: email,
      movieId: normalizedMovieId,
      mediaType: mediaEquals(normalizedMediaType),
    });

    if (!watched) {
      return NextResponse.json(
        { message: "Mark this as watched before rating it." },
        { status: 409 }
      );
    }

    // Update metadata of an existing favorite in place. The positional
    // projection matches the exact (movieId, mediaType) pair.
    const updateFavorite = await User.updateOne(
      {
        email,
        favorites: {
          $elemMatch: {
            movieId: normalizedMovieId,
            mediaType: mediaEquals(normalizedMediaType),
          },
        },
      },
      {
        $set: {
          "favorites.$.personalRating": clampedRating,
          "favorites.$.title": body.movieTitle,
          ...(body.posterPath ? { "favorites.$.posterPath": body.posterPath } : {}),
          // Truthiness, matching the two lines around it. This used to be
          // `!== undefined`, which was always true: `movieRefSchema` gives
          // voteAverage a `.default(0)`, so an absent field arrives as 0 rather
          // than undefined. Any client that omits it -- ProfileFavorites does --
          // therefore overwrote a stored TMDB rating with 0.
          ...(body.voteAverage ? { "favorites.$.voteAverage": body.voteAverage } : {}),
          ...(body.releaseDate ? { "favorites.$.releaseDate": body.releaseDate } : {}),
        },
      }
    );

    if (updateFavorite.matchedCount === 0) {
      // No matching favorite yet: create one atomically with the rating
      // included. The guard is composite so an entry of the *other* media
      // type sharing the TMDB id cannot block it (TMDB ids collide across
      // movie/tv namespaces), and capacity is enforced in the same query.
      const pushedFavorite = await User.updateOne(
        {
          email,
          favorites: {
            $not: {
              $elemMatch: {
                movieId: normalizedMovieId,
                mediaType: mediaEquals(normalizedMediaType),
              },
            },
          },
          $expr: { $lt: [{ $size: { $ifNull: ["$favorites", []] } }, MAX_FAVORITES] },
        },
        {
          $push: {
            favorites: {
              movieId: normalizedMovieId,
              title: body.movieTitle,
              posterPath: body.posterPath,
              voteAverage: body.voteAverage,
              releaseDate: body.releaseDate,
              personalRating: clampedRating,
              mediaType: normalizedMediaType,
              genreIds: body.genreIds || [],
            },
          },
        }
      );

      if (pushedFavorite.modifiedCount === 0) {
        // A no-op push is ambiguous. The guard filter fails for three different
        // reasons, and reporting "full" for all of them claims the rating was
        // rejected when it was in fact stored: the account is at
        // MAX_FAVORITES, or a concurrent request inserted this same favorite
        // first, or the user document is gone. Resolve it with a read, the same
        // way lib/mediaListToggle does before it settles on "full".
        const current = await User.findOne({ email })
          .select("favorites.movieId favorites.mediaType")
          .lean<{ favorites?: { movieId: string; mediaType?: string }[] } | null>();

        if (!current) {
          return NextResponse.json({ message: "Account not found." }, { status: 404 });
        }

        // `mediaEquals` is a query fragment, so mirror it by hand: "tv" is an
        // exact match, "movie" also covers a legacy entry with no mediaType.
        const alreadyStored = (current.favorites || []).some(
          (favorite) =>
            favorite.movieId === normalizedMovieId &&
            (normalizedMediaType === "tv"
              ? favorite.mediaType === "tv"
              : favorite.mediaType !== "tv")
        );

        if (alreadyStored) {
          // Lost the race, so the entry exists without our rating. Apply the
          // update the positional $set above would have performed.
          await User.updateOne(
            {
              email,
              favorites: {
                $elemMatch: {
                  movieId: normalizedMovieId,
                  mediaType: mediaEquals(normalizedMediaType),
                },
              },
            },
            { $set: { "favorites.$.personalRating": clampedRating, "favorites.$.title": body.movieTitle } }
          );
          return NextResponse.json({ rating: clampedRating });
        }

        return NextResponse.json({ message: "Favorites list is full." }, { status: 409 });
      }
    }

    return NextResponse.json({ rating: clampedRating });
  },
  { windowMs: 60 * 1000, limit: 120, errorLabel: "updating movie rating" }
);
