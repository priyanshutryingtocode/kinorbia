import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import MovieList from "@/models/MovieList";
import { getSessionEmail } from "@/lib/session";
import { parseAddToListBody, badRequest } from "@/lib/validators";
import { withRateLimit } from "@/lib/rateLimit";

type ListSummary = {
  _id: { toString: () => string };
  title: string;
};

export async function GET() {
  const email = await getSessionEmail();
  if (!email) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  await dbConnect();
  const lists = await MovieList.find({ userEmail: email })
    .sort({ createdAt: -1 })
    .select({ title: 1 })
    .lean<ListSummary[]>();

  return NextResponse.json({
    lists: lists.map((list) => ({
      id: list._id.toString(),
      title: list.title,
    })),
  });
}

export const POST = withRateLimit(
  async (req: Request) => {
    try {
      const email = await getSessionEmail();
      if (!email) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
      }

      const body = await parseAddToListBody(req);
      if (!body) {
        return badRequest("List and movie are required.");
      }

      const mediaMatch = body.movie.mediaType === "tv" ? "tv" : { $ne: "tv" };

      await dbConnect();
      const result = await MovieList.updateOne(
        {
          _id: body.listId,
          userEmail: email,
          movies: {
            $not: {
              $elemMatch: {
                movieId: body.movie.movieId,
                mediaType: mediaMatch,
              },
            },
          },
        },
        {
          $push: {
            movies: {
              movieId: body.movie.movieId,
              title: body.movie.movieTitle,
              posterPath: body.movie.posterPath,
              voteAverage: body.movie.voteAverage,
              releaseDate: body.movie.releaseDate,
              mediaType: body.movie.mediaType,
            },
          },
        }
      );

      if (result.matchedCount === 0) {
        const listExists = await MovieList.exists({ _id: body.listId, userEmail: email });
        if (!listExists) {
          return NextResponse.json({ message: "List not found" }, { status: 404 });
        }

        return NextResponse.json({ message: "Movie is already in this list" }, { status: 409 });
      }

      return NextResponse.json({ message: "Added to list" });
    } catch (error) {
      console.error("Error adding movie to list:", error);
      return NextResponse.json({ message: "Error adding movie to list" }, { status: 500 });
    }
  },
  { windowMs: 60 * 1000, limit: 120 }
);