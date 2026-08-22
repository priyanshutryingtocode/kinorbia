import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import JournalEntry from "@/models/JournalEntry";
import { getSessionUser } from "@/lib/session";
import { rateMovieSchema, parseMovieBody, badRequest } from "@/lib/validators";
import { withRateLimit } from "@/lib/rateLimit";
import { MAX_FAVORITES } from "@/lib/bounds";
import { mediaEquals } from "@/lib/media";

function isDuplicateKeyError(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error && (error as { code?: number }).code === 11000;
}

export const POST = withRateLimit(
  async (req: Request) => {
    try {
      const { email, name } = await getSessionUser();
      if (!email) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
      }

      const body = await parseMovieBody(req, rateMovieSchema);
      if (!body) {
        return badRequest("Movie and rating are required.");
      }

      const normalizedMovieId = body.movieId;
      const clampedRating = body.rating;
      const normalizedMediaType = body.mediaType;

      await dbConnect();

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
    } catch (error) {
      console.error("Error updating movie rating:", error);
      return NextResponse.json({ message: "Error updating movie rating" }, { status: 500 });
    }
  },
  { windowMs: 60 * 1000, limit: 120 }
);
