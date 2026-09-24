"use client";

import Link from "next/link";
import Image from "next/image";
import { Film, Search, User, LogOut, Menu, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useEffect, useRef, useState } from "react";
import NotificationBell from "./NotificationBell";

const NAV_LINKS = [
  { name: "Home", href: "/" },
  { name: "Shows", href: "/shows" },
  { name: "Reviews", href: "/reviews" },
  { name: "Lists", href: "/lists" },
  { name: "Journal", href: "/journal" },
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
  const mobileButtonRef = useRef<HTMLButtonElement>(null);
  const previousPathname = useRef(pathname);

  const isActive = (path: string) =>
    path === "/" ? pathname === path : pathname === path || pathname.startsWith(`${path}/`);

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

  useEffect(() => {
    if (!accountOpen) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (accountRef.current && !accountRef.current.contains(event.target as Node)) {
        setAccountOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setAccountOpen(false);
        accountButtonRef.current?.focus();
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [accountOpen]);

  useEffect(() => {
    if (!mobileOpen) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileOpen(false);
        mobileButtonRef.current?.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [mobileOpen]);

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

  const handleNotificationOpenChange = (value: boolean) => {
    setNotificationOpen(value);
    if (value) {
      setMobileOpen(false);
      setAccountOpen(false);
    }
  };

  return (
    <header className="shell-header" data-mobile-open={mobileOpen ? "true" : undefined}>
      <nav aria-label="Primary navigation" className="shell-row">
        <Link
          href="/"
          onClick={() => setMobileOpen(false)}
          className="kin-focus group flex shrink-0 items-center gap-2 rounded-control text-content"
          aria-label="KinOrbia home"
        >
          <Film className="h-7 w-7 text-accent transition-transform group-hover:rotate-12 sm:h-8 sm:w-8" aria-hidden="true" />
          <span className="hidden font-display text-xl font-bold min-[360px]:inline sm:text-2xl">
            Kin<span className="text-accent">Orbia</span>
          </span>
        </Link>

        <div className="hidden items-center gap-1 rounded-control border border-rule bg-white/3 p-1 lg:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.name}
              href={link.href}
              aria-current={isActive(link.href) ? "page" : undefined}
              className={`kin-focus rounded-control px-3 py-2 text-sm font-medium transition-colors ${
                isActive(link.href)
                  ? "bg-accent/10 text-red-200 ring-1 ring-accent/25"
                  : "text-content-muted hover:bg-white/7 hover:text-content"
              }`}
            >
              {link.name}
            </Link>
          ))}
        </div>

        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          <Link
            href="/search"
            onClick={() => setMobileOpen(false)}
            className="kin-focus flex h-10 w-10 items-center justify-center rounded-control border border-rule bg-white/3 text-content-muted transition hover:border-rule-strong hover:bg-white/10 hover:text-content"
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
                  className="kin-focus flex h-10 w-10 items-center justify-center rounded-full border border-rule bg-white/3 transition hover:border-accent/50"
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

                {accountOpen && (
                  <div id="account-menu" className="premium-surface absolute right-0 top-full mt-2 w-56 overflow-hidden rounded-overlay">
                    <div className="border-b border-rule bg-white/5 px-4 py-3">
                      <p className="truncate text-sm font-medium text-content">{session.user.name}</p>
                      <p className="truncate text-xs text-content-muted">{session.user.email}</p>
                    </div>
                    <div className="py-1">
                      <Link
                        href="/profile"
                        onClick={() => setAccountOpen(false)}
                        className="kin-focus-inset flex w-full items-center gap-2 px-4 py-3 text-left text-sm text-content-muted transition hover:bg-white/5 hover:text-content"
                      >
                        <User className="h-4 w-4" aria-hidden="true" />
                        Profile
                      </Link>
                      <button
                        type="button"
                        onClick={() => signOut({ callbackUrl: "/" })}
                        className="kin-focus-inset flex w-full items-center gap-2 px-4 py-3 text-left text-sm text-red-400 transition hover:bg-accent/10 hover:text-red-300"
                      >
                        <LogOut className="h-4 w-4" aria-hidden="true" />
                        Sign Out
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </>
          ) : (
            <Link
              href="/login"
              onClick={() => setMobileOpen(false)}
              className="kin-focus flex h-10 w-10 items-center justify-center rounded-control border border-rule bg-white/3 text-content-muted transition hover:border-rule-strong hover:bg-white/10 hover:text-content"
              aria-label="Sign in"
            >
              <User className="h-5 w-5" aria-hidden="true" />
            </Link>
          )}

          <button
            ref={mobileButtonRef}
            type="button"
            onClick={toggleMobile}
            className="kin-focus flex h-10 w-10 items-center justify-center rounded-control border border-rule bg-white/3 text-content-muted transition hover:border-rule-strong hover:bg-white/10 hover:text-content lg:hidden"
            aria-label={mobileOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={mobileOpen}
            aria-controls="mobile-navigation"
          >
            {mobileOpen ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
          </button>
        </div>
      </nav>

      {mobileOpen && (
        <div className="shell-mobile-panel border-t border-rule px-4 pb-4 lg:hidden">
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
                      ? "bg-accent/10 text-red-200 ring-1 ring-accent/25"
                      : "text-content-muted hover:bg-white/7 hover:text-content"
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
                    className="flex items-center gap-2 rounded-control px-3 py-2.5 text-sm font-medium text-content-muted transition hover:bg-white/7 hover:text-content"
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
                    className="flex items-center gap-2 rounded-control px-3 py-2.5 text-left text-sm font-medium text-red-400 transition hover:bg-accent/10 hover:text-red-300"
                  >
                    <LogOut className="h-4 w-4" aria-hidden="true" />
                    Sign Out
                  </button>
                </>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
