import { NextResponse } from "next/server";
import User from "@/models/User";
import JournalEntry from "@/models/JournalEntry";
import { withAuthedUser } from "@/lib/session";
import { rateMovieSchema, parseMovieBody, badRequest } from "@/lib/validators";
import { isDuplicateKeyError } from "@/lib/dbConnect";
import { MAX_FAVORITES } from "@/lib/bounds";
import { mediaEquals } from "@/lib/media";

export const POST = withAuthedUser(
  async (req, { email, name }) => {
    const body = await parseMovieBody(req, rateMovieSchema);
    if (!body) {
      return badRequest("Movie and rating are required.");
    }

    const normalizedMovieId = body.movieId;
    const clampedRating = body.rating;
    const normalizedMediaType = body.mediaType;

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
          ...(body.voteAverage !== undefined ? { "favorites.$.voteAverage": body.voteAverage } : {}),
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
        return NextResponse.json({ message: "Favorites list is full." }, { status: 409 });
      }
    }

    // Mirror the rating onto the journal. Only overwrite stored fields the
    // client actually sent; an absent posterPath must not erase the saved one.
    const journalUpdate = () =>
      JournalEntry.updateOne(
        { userEmail: email, movieId: normalizedMovieId, mediaType: mediaEquals(normalizedMediaType) },
        {
          $set: {
            movieTitle: body.movieTitle,
            ...(body.posterPath ? { posterPath: body.posterPath } : {}),
          },
          $setOnInsert: {
            userEmail: email,
            userName: name || "KinOrbia user",
            movieId: normalizedMovieId,
            mediaType: normalizedMediaType,
            watchedAt: new Date(),
          },
        },
        { upsert: true }
      );

    try {
      await journalUpdate();
    } catch (error) {
      // Concurrent upserts can race past the missing-document check once a
      // unique index exists; retrying applies the update to the winner's doc.
      if (!isDuplicateKeyError(error)) {
        throw error;
      }
      await journalUpdate();
    }

    return NextResponse.json({ rating: clampedRating });
  },
  { windowMs: 60 * 1000, limit: 120, errorLabel: "updating movie rating" }
);
