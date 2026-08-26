"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell, Bookmark, CheckCheck, Heart, Loader2, MessageSquare, UserPlus } from "lucide-react";
import type { NotificationItem } from "@/types";

const ICONS: Record<NotificationItem["type"], React.ReactNode> = {
  like: <Heart className="h-4 w-4 text-red-400" />,
  save: <Bookmark className="h-4 w-4 text-blue-400" />,
  comment: <MessageSquare className="h-4 w-4 text-green-400" />,
  follow: <UserPlus className="h-4 w-4 text-purple-400" />,
};

function messageFor(item: NotificationItem) {
  const verb = { like: "liked", save: "saved", comment: "commented on", follow: "followed" }[item.type];

  if (item.type === "follow") {
    return `${item.actorName} ${verb} you`;
  }

  const noun = item.targetType === "list" ? "list" : "review";
  const title = item.targetTitle ? ` "${item.targetTitle}"` : "";
  return `${item.actorName} ${verb} your ${noun}${title}`;
}

function hrefFor(item: NotificationItem) {
  if (item.type === "follow") {
    return `/u/${item.targetTitle}`;
  }

  if (item.targetType === "list") {
    return `/lists/${item.targetId}`;
  }

  if (item.movieId) {
    return item.mediaType === "tv" ? `/tv/${item.movieId}` : `/movie/${item.movieId}`;
  }

  return "/reviews";
}

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  const loadUnread = async () => {
    try {
      const res = await fetch("/api/user/notifications?unread=1");
      if (res.ok) {
        const data = await res.json();
        setUnread(data.unreadCount ?? 0);
      }
    } catch {
      /* ignore */
    }
  };

  const loadAll = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/user/notifications");
      if (res.ok) {
        const data = await res.json();
        setItems(data.notifications ?? []);
        setUnread(data.unreadCount ?? 0);
      }
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUnread();
    const id = setInterval(loadUnread, 30000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (open) {
      loadAll();
    }
  }, [open]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const markAllRead = async () => {
    try {
      await fetch("/api/user/notifications/read", { method: "POST" });
      setUnread(0);
      setItems((prev) => prev.map((item) => ({ ...item, read: true })));
      router.refresh();
    } catch {
      /* ignore */
    }
  };

  return (
    <div ref={menuRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-label="Notifications"
        aria-expanded={open}
        className="kin-focus relative rounded-full border border-white/10 bg-white/3 p-2 text-neutral-400 transition hover:border-white/20 hover:bg-white/10 hover:text-white"
      >
        <Bell className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-3 w-80 overflow-hidden rounded-lg border border-white/10 bg-neutral-900 shadow-2xl">
          <div className="flex items-center justify-between border-b border-white/10 bg-white/5 px-4 py-3">
            <p className="text-sm font-bold text-white">Notifications</p>
            {unread > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="flex items-center gap-1 text-xs font-bold text-neutral-400 transition hover:text-white"
              >
                <CheckCheck className="h-3.5 w-3.5" />
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8 text-neutral-500">
                <Loader2 className="h-5 w-5 animate-spin" />
              </div>
            ) : items.length > 0 ? (
              items.map((item) => (
                <Link
                  key={item._id}
                  href={hrefFor(item)}
                  onClick={() => setOpen(false)}
                  className={`flex items-start gap-3 border-b border-white/5 px-4 py-3 transition hover:bg-white/5 ${
                    item.read ? "opacity-60" : ""
                  }`}
                >
                  <span className="mt-0.5 shrink-0">{ICONS[item.type]}</span>
                  <span className="min-w-0 text-sm text-neutral-200">{messageFor(item)}</span>
                  {!item.read && <span className="mt-1.5 ml-auto h-2 w-2 shrink-0 rounded-full bg-red-500" />}
                </Link>
              ))
            ) : (
              <p className="px-4 py-8 text-center text-sm text-neutral-500">No notifications yet.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}