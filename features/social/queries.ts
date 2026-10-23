
import "server-only";

import dbConnect from "@/lib/dbConnect";
import { serializeNotification, type RawNotification } from "@/features/social/serializers";
import Notification from "@/models/Notification";
import type { NotificationItem } from "@/types";

const NOTIFICATION_LIMIT = 20;

type NotificationFeed = {
  notifications: NotificationItem[];
  unreadCount: number;
};

export async function countUnreadNotifications(email: string): Promise<number> {
  await dbConnect();
  return Notification.countDocuments({ userEmail: email, read: false });
}

export async function getNotificationFeed(email: string): Promise<NotificationFeed> {
  await dbConnect();

  const [notifications, unreadCount] = await Promise.all([
    Notification.find({ userEmail: email })
      .select(
        "_id userEmail type actorEmail actorName targetType targetId targetTitle movieId mediaType read createdAt"
      )
      .sort({ createdAt: -1 })
      .limit(NOTIFICATION_LIMIT)
      .lean<RawNotification[]>(),
    Notification.countDocuments({ userEmail: email, read: false }),
  ]);

  return { notifications: notifications.map(serializeNotification), unreadCount };
}
