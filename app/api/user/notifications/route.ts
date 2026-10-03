import { NextResponse } from "next/server";
import Notification from "@/models/Notification";
import { withAuthedUser } from "@/lib/session";
import { serializeNotification, type RawNotification } from "@/lib/serialize";

export const GET = withAuthedUser(
  async (req, { email }) => {
    const { searchParams } = new URL(req.url);

    // The badge poll asks for `?unread=1` only to read `unreadCount`, so it
    // returns early with just the count -- otherwise every 30 seconds the server
    // hydrates and serializes up to 20 full notifications for a client that
    // discards them. The dropdown omits the parameter and gets the full list.
    if (searchParams.get("unread") === "1") {
      const unreadCount = await Notification.countDocuments({ userEmail: email, read: false });
      return NextResponse.json({ unreadCount });
    }

    // Kept concurrent so opening the dropdown costs one round trip, not two.
    const [notifications, unreadCount] = await Promise.all([
      Notification.find({ userEmail: email })
        .select(
          "_id userEmail type actorEmail actorName targetType targetId targetTitle movieId mediaType read createdAt"
        )
        .sort({ createdAt: -1 })
        .limit(20)
        .lean<RawNotification[]>(),
      Notification.countDocuments({ userEmail: email, read: false }),
    ]);

    return NextResponse.json({
      notifications: notifications.map(serializeNotification),
      unreadCount,
    });
  },
  { windowMs: 60 * 1000, limit: 60, errorLabel: "loading notifications" }
);
