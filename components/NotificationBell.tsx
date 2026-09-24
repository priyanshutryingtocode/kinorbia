"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createPortal } from "react-dom";
import { Bell, Bookmark, CheckCheck, Heart, Loader2, MessageSquare, UserPlus } from "lucide-react";
import type { NotificationItem } from "@/types";

const ICONS: Record<NotificationItem["type"], React.ReactNode> = {
  like: <Heart className="h-4 w-4 text-red-400" aria-hidden="true" />,
  save: <Bookmark className="h-4 w-4 text-blue-400" aria-hidden="true" />,
  comment: <MessageSquare className="h-4 w-4 text-green-400" aria-hidden="true" />,
  follow: <UserPlus className="h-4 w-4 text-purple-400" aria-hidden="true" />,
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
    return item.targetTitle ? `/u/${item.targetTitle}` : "/activity";
  }

  if (item.targetType === "list") {
    return `/lists/${item.targetId}`;
  }

  if (item.movieId) {
    return item.mediaType === "tv" ? `/tv/${item.movieId}` : `/movie/${item.movieId}`;
  }

  return "/reviews";
}

type NotificationBellProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export default function NotificationBell({ open, onOpenChange }: NotificationBellProps) {
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [marking, setMarking] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const router = useRouter();

  const loadUnread = useCallback(async () => {
    try {
      const res = await fetch("/api/user/notifications?unread=1");
      if (res.ok) {
        const data = await res.json();
        setUnread(data.unreadCount ?? 0);
      }
    } catch {
      return;
    }
  }, []);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/user/notifications");
      if (res.ok) {
        const data = await res.json();
        setItems(data.notifications ?? []);
        setUnread(data.unreadCount ?? 0);
      }
    } catch {
      return;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadUnread();
    const id = window.setInterval(() => void loadUnread(), 30000);
    return () => window.clearInterval(id);
  }, [loadUnread]);

  useEffect(() => {
    if (open) {
      void loadAll();
      panelRef.current?.focus();
    }
  }, [open, loadAll]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (
        menuRef.current &&
        panelRef.current &&
        !menuRef.current.contains(target) &&
        !panelRef.current.contains(target)
      ) {
        onOpenChange(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onOpenChange(false);
        triggerRef.current?.focus();
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open, onOpenChange]);

  const markAllRead = async () => {
    if (marking) {
      return;
    }

    setMarking(true);
    try {
      const res = await fetch("/api/user/notifications/read", { method: "POST" });
      if (!res.ok) {
        return;
      }
      setUnread(0);
      setItems((current) => current.map((item) => ({ ...item, read: true })));
      router.refresh();
    } catch {
      return;
    } finally {
      setMarking(false);
    }
  };

  return (
    <div ref={menuRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => onOpenChange(!open)}
        aria-label={unread > 0 ? `Notifications, ${unread} unread` : "Notifications"}
        aria-expanded={open}
        aria-controls="notification-panel"
        className="kin-focus relative flex h-10 w-10 items-center justify-center rounded-control border border-rule bg-white/3 text-content-muted transition hover:border-rule-strong hover:bg-white/10 hover:text-content"
      >
        <Bell className="h-5 w-5" aria-hidden="true" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-bold text-white" aria-hidden="true">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>

      {open && typeof document !== "undefined" && createPortal(
        <div
          ref={panelRef}
          id="notification-panel"
          role="dialog"
          aria-modal="false"
          aria-labelledby="notification-heading"
          tabIndex={-1}
          className="fixed inset-x-4 top-[calc(var(--shell-header-height)+0.5rem)] z-[var(--z-header)] flex max-h-[calc(100dvh-var(--shell-header-height)-1rem)] flex-col overflow-hidden rounded-overlay border border-rule bg-surface shadow-2xl lg:left-auto lg:w-80"
        >
          <div className="flex shrink-0 items-center justify-between border-b border-rule bg-white/5 px-4 py-3">
            <h2 id="notification-heading" className="text-sm font-bold text-content">Notifications</h2>
            {unread > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                disabled={marking}
                className="kin-focus-inset flex min-h-8 items-center gap-1 rounded-control px-1.5 text-xs font-bold text-content-muted transition hover:text-content disabled:cursor-not-allowed disabled:opacity-50"
              >
                <CheckCheck className="h-3.5 w-3.5" aria-hidden="true" />
                {marking ? "Marking..." : "Mark all read"}
              </button>
            )}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-8 text-content-subtle" role="status">
                <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
                <span className="sr-only">Loading notifications</span>
              </div>
            ) : items.length > 0 ? (
              items.map((item) => (
                <Link
                  key={item._id}
                  href={hrefFor(item)}
                  onClick={() => onOpenChange(false)}
                  className={`kin-focus-inset flex items-start gap-3 border-b border-rule px-4 py-3 transition hover:bg-white/5 ${item.read ? "opacity-60" : ""}`}
                >
                  <span className="mt-0.5 shrink-0">{ICONS[item.type]}</span>
                  <span className="min-w-0 text-sm text-neutral-200">{messageFor(item)}</span>
                  {!item.read && <span className="mt-1.5 ml-auto h-2 w-2 shrink-0 rounded-full bg-accent" aria-hidden="true" />}
                </Link>
              ))
            ) : (
              <p className="px-4 py-8 text-center text-sm text-content-subtle">No notifications yet.</p>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
