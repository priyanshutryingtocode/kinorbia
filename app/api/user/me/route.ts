import { NextResponse } from "next/server";
import { withAuthedUser } from "@/lib/session";
import { getProfileIdentity, getRelationshipCounts } from "@/features/profile/queries";
import { logger } from "@/lib/logger";


export const GET = withAuthedUser(
  async (_req, { email }) => {
    try {
      const identity = await getProfileIdentity(email);
      if (!identity) {
        return NextResponse.json({ message: "Account not found." }, { status: 404 });
      }

      const { followers, following } = await getRelationshipCounts(identity);

      return NextResponse.json({
        email: identity.email,
        name: identity.name,
        username: identity.username ?? null,
        bio: identity.bio ?? "",
        image: identity.image ?? null,
        createdAt: identity.createdAt ?? null,
        shareActivity: Boolean(identity.shareActivity),
        followers,
        following,
      });
    } catch (error) {
      logger.error("identity read failed", { error });
      return NextResponse.json({ message: "Could not load your profile." }, { status: 500 });
    }
  },
  { windowMs: 60 * 1000, limit: 120, errorLabel: "loading identity" }
);