import { NextResponse } from "next/server";
import { withAuthedUser } from "@/lib/session";
import { countUnreadNotifications, getNotificationFeed } from "@/features/social/queries";

export const GET = withAuthedUser(
  async (req, { email }) => {
    const { searchParams } = new URL(req.url);

    if (searchParams.get("unread") === "1") {
      return NextResponse.json({ unreadCount: await countUnreadNotifications(email) });
    }

    const { notifications, unreadCount } = await getNotificationFeed(email);

    return NextResponse.json({ notifications, unreadCount });
  },
  { windowMs: 60 * 1000, limit: 60, errorLabel: "loading notifications" }
);
