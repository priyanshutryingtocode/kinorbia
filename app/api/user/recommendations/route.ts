import { NextResponse } from "next/server";
import { withAuthedUser } from "@/lib/session";
import { getTasteRecommendations } from "@/features/media/recommendations";
import { logger } from "@/lib/logger";

// Taste-based recommendations for the signed-in member.

export const GET = withAuthedUser(
  async (_req, { email }) => {
    try {
      return NextResponse.json(await getTasteRecommendations(email));
    } catch (error) {
      logger.error("taste recommendations failed", { error });
      return NextResponse.json({ message: "Could not build recommendations." }, { status: 500 });
    }
  },
  { windowMs: 60 * 1000, limit: 30, errorLabel: "loading recommendations" }
);