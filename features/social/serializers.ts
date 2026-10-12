import type { NotificationItem } from "@/types";

export type RawNotification = Omit<NotificationItem, "_id" | "createdAt"> & {
  _id: { toString: () => string };
  createdAt: Date;
};

export function serializeNotification(notification: RawNotification): NotificationItem {
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