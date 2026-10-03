"use client";

import Link from "next/link";
import Image from "next/image";
import { Film, Search, User, LogOut, Menu, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import NotificationBell from "./NotificationBell";
import ThemeToggle from "./ThemeToggle";
import { useDismiss } from "@/lib/useDismiss";
import { ICON_BUTTON_CLASS } from "@/lib/uiClasses";

const NAV_LINKS = [
  { name: "Movies", href: "/" },
  { name: "Shows", href: "/shows" },
  { name: "Reviews", href: "/reviews" },
  { name: "Lists", href: "/lists" },
  { name: "Activity", href: "/activity" },
];

export default function Navbar() {
  const pathname = usePathname();
  return <NavbarShell pathname={pathname} />;
}

function NavbarShell({ pathname }: { pathname: string }) {
  const { data: session, status } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const [notificationOpen, setNotificationOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);
  const accountButtonRef = useRef<HTMLButtonElement>(null);
  // The portalled menu, which is no longer a descendant of accountRef.
  const accountMenuRef = useRef<HTMLDivElement>(null);
  const mobileButtonRef = useRef<HTMLButtonElement>(null);
  const previousPathname = useRef(pathname);

  const isActive = (path: string) =>
    path === "/" ? pathname === path : pathname === path || pathname.startsWith(`${path}/`);

  // Stable identities: useDismiss lists `onDismiss` in its dependency array, so
  // an inline arrow would re-run the effect on every render.
  const closeAccount = useCallback(() => setAccountOpen(false), []);
  const closeMobile = useCallback(() => setMobileOpen(false), []);

  useEffect(() => {
    if (previousPathname.current === pathname) {
      return;
    }

    previousPathname.current = pathname;
    const frame = window.requestAnimationFrame(() => {
      setMobileOpen(false);
      setAccountOpen(false);
      setNotificationOpen(false);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [pathname]);

  useDismiss({
    open: accountOpen,
    onDismiss: closeAccount,
    returnFocusRef: accountButtonRef,
    // Both the trigger's wrapper and the portalled menu itself: a press on
    // either has to count as still-inside.
    insideRefs: [accountRef, accountMenuRef],
  });

  // No outside-press dismissal here: the mobile panel is closed by Escape or by
  // choosing a destination, not by tapping the page behind it.
  useDismiss({
    open: mobileOpen,
    onDismiss: closeMobile,
    returnFocusRef: mobileButtonRef,
    dismissOnPointerDownOutside: false,
  });

  const toggleMobile = () => {
    setMobileOpen((value) => {
      if (!value) {
        setAccountOpen(false);
        setNotificationOpen(false);
      }
      return !value;
    });
  };

  const toggleAccount = () => {
    setAccountOpen((value) => {
      if (!value) {
        setMobileOpen(false);
        setNotificationOpen(false);
      }
      return !value;
    });
  };

  // Stable so that NotificationBell's `close`, which wraps it, is stable too --
  // otherwise useDismiss's effect would tear down and re-add its listeners on
  // every render of the Navbar.
  const handleNotificationOpenChange = useCallback((value: boolean) => {
    setNotificationOpen(value);
    if (value) {
      closeMobile();
      closeAccount();
    }
  }, [closeMobile, closeAccount]);

  return (
    <header className="shell-header kin-ink-band" data-mobile-open={mobileOpen ? "true" : undefined}>
      <nav aria-label="Primary navigation" className="shell-row">
        <Link
          href="/"
          onClick={() => setMobileOpen(false)}
          className="kin-focus group flex shrink-0 items-center gap-2 rounded-control text-content"
          aria-label="KinOrbia home"
        >
          <Film className="h-7 w-7 text-accent transition-transform group-hover:rotate-12 sm:h-8 sm:w-8" aria-hidden="true" />
          <span className="hidden font-display text-xl font-medium min-[360px]:inline sm:text-2xl">
            Kin<span className="text-accent">Orbia</span>
          </span>
        </Link>

        <div className="hidden items-center gap-1 rounded-control border border-rule bg-glass p-1 lg:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.name}
              href={link.href}
              aria-current={isActive(link.href) ? "page" : undefined}
              className={`kin-focus rounded-control px-3 py-2 text-sm font-medium transition-colors ${
                isActive(link.href)
                  ? "bg-accent/10 text-accent-text ring-1 ring-accent/25"
                  : "text-content-muted hover:bg-glass-strong hover:text-content"
              }`}
            >
              {link.name}
            </Link>
          ))}
        </div>

        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          <ThemeToggle />

          <Link
            href="/search"
            onClick={() => setMobileOpen(false)}
            className={ICON_BUTTON_CLASS}
            aria-label="Search films"
          >
            <Search className="h-5 w-5" aria-hidden="true" />
          </Link>

          {status === "loading" ? (
            <div className="h-10 w-10 animate-pulse rounded-full border border-rule bg-surface-raised" role="status">
              <span className="sr-only">Loading account</span>
            </div>
          ) : session?.user ? (
            <>
              <NotificationBell open={notificationOpen} onOpenChange={handleNotificationOpenChange} />
              <div ref={accountRef} className="relative">
                <button
                  ref={accountButtonRef}
                  type="button"
                  onClick={toggleAccount}
                  className="kin-focus flex h-10 w-10 items-center justify-center rounded-full border border-rule bg-glass transition hover:border-accent/50"
                  aria-label="Account menu"
                  aria-expanded={accountOpen}
                  aria-controls="account-menu"
                >
                  {session.user.image ? (
                    <Image
                      src={session.user.image}
                      alt=""
                      width={36}
                      height={36}
                      className="h-8 w-8 rounded-full object-cover sm:h-9 sm:w-9"
                    />
                  ) : (
                    <User className="h-4 w-4 text-content-muted" aria-hidden="true" />
                  )}
                </button>

                {/* Portalled to <body> rather than positioned inside the header.
                    `.shell-header` has a backdrop-filter, which makes it a
                    backdrop root, so a descendant's own backdrop-filter can only
                    sample inside that root -- the blur here was diffusing the
                    header's flat band instead of the page, which left the panel
                    20% transparent with nothing softening what showed through.
                    NotificationBell already works this way.

                    `right` comes from the row's own geometry rather than a fixed
                    inset: `.shell-row` is `mx-auto max-w-page px-4 sm:px-6` with
                    --container-page at 80rem, so on a wide screen the trigger sits
                    (100vw - 80rem)/2 + 1.5rem from the right edge, not at a
                    constant. A plain right-4 drifts off its button past 1280px. */}
                {accountOpen &&
                  typeof document !== "undefined" &&
                  createPortal(
                    <div
                      id="account-menu"
                      ref={accountMenuRef}
                      className="premium-surface fixed top-[calc(var(--shell-header-height)+0.5rem)] right-4 w-56 overflow-hidden rounded-overlay sm:right-[max(1.5rem,calc((100vw-80rem)/2+1.5rem))]"
                    >
                    <div className="border-b border-rule bg-surface px-4 py-3">
                      <p className="truncate text-sm font-medium text-content">{session.user.name}</p>
                      <p className="truncate text-xs text-content-muted">{session.user.email}</p>
                    </div>
                    <div className="py-1">
                      <Link
                        href="/profile"
                        onClick={() => setAccountOpen(false)}
                        className="kin-focus-inset flex w-full items-center gap-2 px-4 py-3 text-left text-sm text-content-muted transition hover:bg-surface hover:text-content"
                      >
                        <User className="h-4 w-4" aria-hidden="true" />
                        Profile
                      </Link>
                      <button
                        type="button"
                        onClick={() => signOut({ callbackUrl: "/" })}
                        className="kin-focus-inset flex w-full items-center gap-2 px-4 py-3 text-left text-sm text-danger transition hover:bg-accent/10 hover:text-accent-text"
                      >
                        <LogOut className="h-4 w-4" aria-hidden="true" />
                        Sign Out
                      </button>
                    </div>
                    </div>,
                    document.body
                  )}
              </div>
            </>
          ) : (
            <Link
              href="/login"
              onClick={() => setMobileOpen(false)}
              className={ICON_BUTTON_CLASS}
              aria-label="Sign in"
            >
              <User className="h-5 w-5" aria-hidden="true" />
            </Link>
          )}

          <button
            ref={mobileButtonRef}
            type="button"
            onClick={toggleMobile}
            className={`${ICON_BUTTON_CLASS} lg:hidden`}
            aria-label={mobileOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={mobileOpen}
            aria-controls="mobile-navigation"
          >
            {mobileOpen ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
          </button>
        </div>
      </nav>

      {/* Portalled for the same reason as the account menu above: inside the
          header its backdrop-filter cannot see the page. */}
      {mobileOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div className="shell-mobile-panel fixed inset-x-0 top-[var(--shell-header-height)] border-t border-rule px-4 pb-4 lg:hidden">
            <nav id="mobile-navigation" aria-label="Mobile navigation" className="premium-surface mx-auto max-w-page overflow-hidden rounded-overlay">
            <div className="grid gap-1 p-1.5">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.name}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  aria-current={isActive(link.href) ? "page" : undefined}
                  className={`rounded-control px-3 py-2.5 text-sm font-medium transition-colors ${
                    isActive(link.href)
                      ? "bg-accent/10 text-accent-text ring-1 ring-accent/25"
                      : "text-content-muted hover:bg-glass-strong hover:text-content"
                  }`}
                >
                  {link.name}
                </Link>
              ))}

              {session?.user && (
                <>
                  <div className="my-1 h-px bg-rule" />
                  <Link
                    href="/profile"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-2 rounded-control px-3 py-2.5 text-sm font-medium text-content-muted transition hover:bg-glass-strong hover:text-content"
                  >
                    <User className="h-4 w-4" aria-hidden="true" />
                    Profile
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setMobileOpen(false);
                      signOut({ callbackUrl: "/" });
                    }}
                    className="flex items-center gap-2 rounded-control px-3 py-2.5 text-left text-sm font-medium text-danger transition hover:bg-accent/10 hover:text-accent-text"
                  >
                    <LogOut className="h-4 w-4" aria-hidden="true" />
                    Sign Out
                  </button>
                </>
              )}
            </div>
            </nav>
          </div>,
          document.body
        )}
    </header>
  );
}
