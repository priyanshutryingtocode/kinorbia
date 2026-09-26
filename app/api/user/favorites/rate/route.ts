import { NextResponse } from "next/server";
import User from "@/models/User";
import { withAuthedUser } from "@/lib/session";
import { rateFavoriteSchema, parseBody, badRequest } from "@/lib/validators";
import { mediaEquals } from "@/lib/media";

export const POST = withAuthedUser(
  async (req: Request, { email }) => {
    const body = await parseBody(req, rateFavoriteSchema);
    if (!body) {
      return badRequest("Movie and rating are required.");
    }

    const result = await User.updateOne(
      {
        email,
        "favorites.movieId": body.movieId,
        "favorites.mediaType": mediaEquals(body.mediaType),
      },
      {
        $set: { "favorites.$.personalRating": body.rating },
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { message: "Favorite not found. Rate it from your favorites list." },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "Rating updated" });
  },
  { windowMs: 60 * 1000, limit: 20, errorLabel: "updating rating" }
);
