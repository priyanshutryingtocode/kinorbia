import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import { getSessionEmail } from "@/lib/session";
import { movieRefSchema, parseMovieBody, badRequest } from "@/lib/validators";
import { withRateLimit } from "@/lib/rateLimit";
import { MAX_WATCHLIST } from "@/lib/bounds";
import { mediaEquals } from "@/lib/media";

export const POST = withRateLimit(
  async (req: Request) => {
    try {
      const email = await getSessionEmail();
      if (!email) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
      }

      const body = await parseMovieBody(req, movieRefSchema);
      if (!body) {
        return badRequest("A valid movie is required.");
      }

      await dbConnect();

      // Atomic add-first toggle: same guarded-update pattern as favorites so
      // concurrent toggles can neither duplicate entries nor exceed the cap.
      const added = await User.updateOne(
        {
          email,
          watchlist: {
            $not: {
              $elemMatch: {
                movieId: body.movieId,
                mediaType: mediaEquals(body.mediaType),
              },
            },
          },
          $expr: { $lt: [{ $size: { $ifNull: ["$watchlist", []] } }, MAX_WATCHLIST] },
        },
        {
          $push: {
            watchlist: {
              movieId: body.movieId,
              title: body.movieTitle,
              posterPath: body.posterPath,
              voteAverage: body.voteAverage,
              releaseDate: body.releaseDate,
              mediaType: body.mediaType,
            },
          },
        }
      );

      if (added.modifiedCount > 0) {
        return NextResponse.json({ isWatchlisted: true });
      }

      const removed = await User.updateOne(
        {
          email,
          "watchlist.movieId": body.movieId,
          "watchlist.mediaType": mediaEquals(body.mediaType),
        },
        {
          $pull: {
            watchlist: {
              movieId: body.movieId,
              mediaType: mediaEquals(body.mediaType),
            },
          },
        }
      );

      if (removed.modifiedCount > 0) {
        return NextResponse.json({ isWatchlisted: false });
      }

      const userExists = await User.exists({ email });
      if (!userExists) {
        return NextResponse.json({ message: "User not found." }, { status: 404 });
      }

      return NextResponse.json({ message: "Watchlist is full." }, { status: 409 });
    } catch (error) {
      console.error("Error updating watchlist:", error);
      return NextResponse.json({ message: "Error updating watchlist" }, { status: 500 });
    }
  },
  { windowMs: 60 * 1000, limit: 60 }
);
