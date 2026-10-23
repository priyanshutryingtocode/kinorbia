import { NextResponse } from "next/server";
import { withAuthedUser } from "@/lib/session";
import { getActivityFeed } from "@/features/activity/queries";
import { logger } from "@/lib/logger";


export const GET = withAuthedUser(
  async (req, { email }) => {
    const { searchParams } = new URL(req.url);
    const cursor = searchParams.get("cursor");
    const isFollowingFeed = searchParams.get("feed") === "following";

    try {
      const feed = await getActivityFeed({ isFollowingFeed, sessionEmail: email, cursor });
      return NextResponse.json(feed);
    } catch (error) {
      logger.error("feed read failed", { isFollowingFeed, error });
      return NextResponse.json({ message: "Could not load activity." }, { status: 500 });
    }
  },
  { windowMs: 60 * 1000, limit: 120, errorLabel: "loading activity" }
);