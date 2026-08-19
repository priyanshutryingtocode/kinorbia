import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import Notification from "@/models/Notification";
import { getSessionEmail } from "@/lib/session";
import { withRateLimit } from "@/lib/rateLimit";
import type { NotificationItem } from "@/types";

type RawNotification = {
  _id: { toString: () => string };
  userEmail: string;
  type: NotificationItem["type"];
  actorEmail: string;
  actorName: string;
  targetType: NotificationItem["targetType"];
  targetId: string;
  targetTitle: string;
  movieId?: string;
  mediaType?: NotificationItem["mediaType"];
  read: boolean;
  createdAt: Date;
};

function serialize(notification: RawNotification): NotificationItem {
  return {
    _id: notification._id.toString(),
    userEmail: notification.userEmail,
    type: notification.type,
    actorEmail: notification.actorEmail,
    actorName: notification.actorName,
    targetType: notification.targetType,
    targetId: notification.targetId,
    targetTitle: notification.targetTitle,
    movieId: notification.movieId,
    mediaType: notification.mediaType,
    read: notification.read,
    createdAt: notification.createdAt.toISOString(),
  };
}

export const GET = withRateLimit(
  async (req: Request) => {
    try {
      const email = await getSessionEmail();
      if (!email) {
        return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
      }

      const { searchParams } = new URL(req.url);
      const unreadOnly = searchParams.get("unread") === "1";

      await dbConnect();

      const filter: { userEmail: string; read?: boolean } = { userEmail: email };
      if (unreadOnly) {
        filter.read = false;
      }

      const [notifications, unreadCount] = await Promise.all([
        Notification.find(filter)
          .sort({ createdAt: -1 })
          .limit(20)
          .lean<RawNotification[]>(),
        Notification.countDocuments({ userEmail: email, read: false }),
      ]);

      return NextResponse.json({
        notifications: notifications.map(serialize),
        unreadCount,
      });
    } catch {
      return NextResponse.json({ message: "Error loading notifications" }, { status: 500 });
    }
  },
  { windowMs: 60 * 1000, limit: 60 }
);