"use client";

import Link from "next/link";
import Image from "next/image";
import { Film, Search, User, LogOut } from "lucide-react";
import { usePathname } from "next/navigation";
import { useSession, signOut } from "next-auth/react";

export default function Navbar() {
  const pathname = usePathname();
  const { data: session, status } = useSession();

  const isActive = (path: string) => pathname === path;

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-neutral-950/80 backdrop-blur-md border-b border-white/5">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        
        <Link href="/" className="flex items-center gap-2 group">
          <Film className="w-8 h-8 text-red-600 transition-transform group-hover:rotate-12" />
          <span className="text-2xl font-bold tracking-tighter text-white">
            Kin<span className="text-red-600">Orbia</span>
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-8">
          {[
            { name: "Home", href: "/" },
            { name: "Reviews", href: "/reviews" },
            { name: "Lists", href: "/lists" },
            { name: "Journal", href: "/journal" },
          ].map((link) => (
            <Link
              key={link.name}
              href={link.href}
              className={`text-sm font-medium transition-colors ${
                isActive(link.href) ? "text-red-500" : "text-neutral-400 hover:text-white"
              }`}
            >
              {link.name}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-6">
          <Link href="/search" className="text-neutral-400 hover:text-white transition">
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
                <div className="bg-neutral-900 border border-white/10 rounded-xl shadow-2xl shadow-black overflow-hidden ring-1 ring-white/5">
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
            <Link href="/login" className="p-2 bg-white/5 rounded-full text-neutral-400 hover:text-white hover:bg-white/10 transition group">
              <User className="w-5 h-5 group-hover:scale-110 transition-transform" />
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}
