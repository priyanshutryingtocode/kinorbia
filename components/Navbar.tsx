"use client";

import Link from "next/link";
import Image from "next/image";
import { Film, Search, User, LogOut, Menu, X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useState } from "react";

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
  const { data: session, status } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isActive = (path: string) => pathname === path;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 border-b border-white/10 bg-neutral-950/75 shadow-[0_18px_60px_-42px_rgba(0,0,0,0.95)] backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-20 flex items-center justify-between">
        
        <Link href="/" className="flex items-center gap-2 group">
          <Film className="w-7 h-7 sm:w-8 sm:h-8 text-red-600 transition-transform group-hover:rotate-12" />
          <span className="text-xl font-bold text-white sm:text-2xl">
            Kin<span className="text-red-600">Orbia</span>
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] p-1">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.name}
              href={link.href}
              className={`rounded-full px-4 py-2 text-sm font-medium transition-all ${
                isActive(link.href)
                  ? "bg-red-500/12 text-red-200 ring-1 ring-red-500/25"
                  : "text-neutral-400 hover:bg-white/7 hover:text-white"
              }`}
            >
              {link.name}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          <Link href="/search" className="kin-focus rounded-full border border-white/10 bg-white/[0.03] p-2 text-neutral-400 transition hover:border-white/20 hover:bg-white/10 hover:text-white">
            <Search className="w-5 h-5" />
          </Link>

          {status === "loading" ? (
             <div className="w-9 h-9 rounded-full bg-neutral-800 animate-pulse border border-white/5"></div>
          ) : session?.user ? (
            <div className="relative group cursor-pointer h-9 flex items-center">
              {session.user.image ? (
                <Image
                  src={session.user.image}
                  alt="Profile"
                  width={36}
                  height={36}
                  className="w-9 h-9 rounded-full border border-white/10 group-hover:border-red-500 transition-all object-cover"
                />
              ) : (
                <div className="w-9 h-9 rounded-full border border-white/10 group-hover:border-red-500 transition-all bg-white/5 flex items-center justify-center text-neutral-400">
                  <User className="w-5 h-5" />
                </div>
              )}
              
              <div className="absolute right-0 top-full pt-3 w-56 hidden group-hover:block">
                <div className="premium-surface overflow-hidden rounded-lg ring-1 ring-white/5">
                  <div className="px-4 py-3 border-b border-white/5 bg-white/5">
                    <p className="text-sm text-white font-medium truncate">{session.user.name}</p>
                    <p className="text-xs text-neutral-400 truncate">{session.user.email}</p>
                  </div>

                  <div className="py-1">
                    <Link 
                      href="/profile" 
                      className="w-full text-left px-4 py-3 text-sm text-neutral-300 hover:bg-white/5 hover:text-white transition flex items-center gap-2"
                    >
                      <User className="w-4 h-4" />
                      Profile
                    </Link>

                    <button 
                      onClick={() => signOut({ callbackUrl: "/" })}
                      className="w-full text-left px-4 py-3 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 transition flex items-center gap-2"
                    >
                      <LogOut className="w-4 h-4" />
                      Sign Out
                    </button>
                  </div>
                </div>
              </div>

            </div>
          ) : (
            <Link href="/login" className="kin-focus rounded-full border border-white/10 bg-white/[0.03] p-2 text-neutral-400 transition hover:border-white/20 hover:bg-white/10 hover:text-white group">
              <User className="w-5 h-5 group-hover:scale-110 transition-transform" />
            </Link>
          )}

          <button
            type="button"
            onClick={() => setMobileOpen((value) => !value)}
            className="kin-focus rounded-full border border-white/10 bg-white/[0.03] p-2 text-neutral-400 transition hover:border-white/20 hover:bg-white/10 hover:text-white md:hidden"
            aria-label={mobileOpen ? "Close navigation menu" : "Open navigation menu"}
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {mobileOpen && (
        <div className="border-t border-white/10 px-4 pb-4 md:hidden">
          <div className="premium-surface mx-auto max-w-7xl overflow-hidden rounded-lg">
            <div className="grid gap-1 p-1.5">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.name}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={`rounded-md px-4 py-3 text-sm font-medium transition-all ${
                    isActive(link.href)
                      ? "bg-red-500/12 text-red-200 ring-1 ring-red-500/25"
                      : "text-neutral-300 hover:bg-white/7 hover:text-white"
                  }`}
                >
                  {link.name}
                </Link>
              ))}

              {session?.user && (
                <>
                  <div className="my-1 h-px bg-white/10" />
                  <Link
                    href="/profile"
                    onClick={() => setMobileOpen(false)}
                    className="flex items-center gap-2 rounded-md px-4 py-3 text-sm font-medium text-neutral-300 transition-all hover:bg-white/7 hover:text-white"
                  >
                    <User className="h-4 w-4" />
                    Profile
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      setMobileOpen(false);
                      signOut({ callbackUrl: "/" });
                    }}
                    className="flex items-center gap-2 rounded-md px-4 py-3 text-left text-sm font-medium text-red-400 transition-all hover:bg-red-500/10 hover:text-red-300"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}
