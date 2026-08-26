import { NextResponse } from "next/server";
import Notification from "@/models/Notification";
import { withAuthedUser } from "@/lib/session";
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

export const GET = withAuthedUser(
  async (req, { email }) => {
    const { searchParams } = new URL(req.url);
    const unreadOnly = searchParams.get("unread") === "1";

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
  },
  { windowMs: 60 * 1000, limit: 60, errorLabel: "loading notifications" }
);
