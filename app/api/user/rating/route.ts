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

    // Update metadata of an existing favorite in place.
    //
    // Two things are deliberate here, and both are easy to undo by accident.
    //
    // 1. The `$elemMatch` stays in the *filter* even though the write uses
    //    arrayFilters. With arrayFilters alone, `matchedCount` counts documents
    //    matching the filter rather than array elements, so it would always be 1
    //    and the "no favorite yet" branch below would be unreachable -- rating a
    //    title for the first time would silently do nothing.
    //
    // 2. The write targets every matching element via `$[f]`, not the
    //    positional `$`. `$` resolves to the *first* match, while both read
    //    paths deliberately keep the *last* (see dedupeFavorites, which changed
    //    from first to last for exactly this reason). So on a legacy row holding
    //    duplicate (movieId, mediaType) entries -- only rows predating the unique
    //    index can contain them -- the rating was written to a copy no read path
    //    looks at, and the user saw "Rated 8.0 stars" with nothing stored
    //    anywhere it could be read back. Updating all copies removes the
    //    disagreement instead of depending on which one wins.
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
          "favorites.$[f].personalRating": clampedRating,
          "favorites.$[f].title": body.movieTitle,
          ...(body.posterPath ? { "favorites.$[f].posterPath": body.posterPath } : {}),
          ...(body.voteAverage ? { "favorites.$[f].voteAverage": body.voteAverage } : {}),
          ...(body.releaseDate ? { "favorites.$[f].releaseDate": body.releaseDate } : {}),
        },
      },
      {
        arrayFilters: [
          {
            "f.movieId": normalizedMovieId,
            "f.mediaType": mediaEquals(normalizedMediaType),
          },
        ],
      }
    );

    if (updateFavorite.matchedCount === 0) {
      // No matching favorite yet: create one atomically with the rating
      // included.
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
        const current = await User.findOne({ email })
          .select("favorites.movieId favorites.mediaType")
          .lean<{ favorites?: { movieId: string; mediaType?: string }[] } | null>();

        if (!current) {
          return NextResponse.json({ message: "Account not found." }, { status: 404 });
        }

        const alreadyStored = (current.favorites || []).some(
          (favorite) =>
            favorite.movieId === normalizedMovieId &&
            (normalizedMediaType === "tv"
              ? favorite.mediaType === "tv"
              : favorite.mediaType !== "tv")
        );

        if (alreadyStored) {
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
