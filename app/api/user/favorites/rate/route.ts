import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import { getSessionEmail } from "@/lib/session";
import { rateFavoriteSchema, parseBody, badRequest } from "@/lib/validators";
import { withRateLimit } from "@/lib/rateLimit";
import { mediaEquals } from "@/lib/media";

export const POST = withRateLimit(
  async (req: Request) => {
    try {
      const email = await getSessionEmail();
      if (!email) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
      }

      const body = await parseBody(req, rateFavoriteSchema);
      if (!body) {
        return badRequest("Movie and rating are required.");
      }

      await dbConnect();

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
    } catch (error) {
      console.error("Error updating rating:", error);
      return NextResponse.json({ message: "Error updating rating" }, { status: 500 });
    }
  },
  { windowMs: 60 * 1000, limit: 20 }
);