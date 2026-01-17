"use client"; // <--- Crucial: Makes this interactive

import Link from "next/link";
import { Film, Search, User, Menu, X } from "lucide-react";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Navbar() {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const router = useRouter();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      router.push(`/search?q=${query}`);
      setIsSearchOpen(false); // Close bar after search
    }
  };

  return (
    <nav className="fixed top-0 w-full z-50 border-b border-white/10 bg-neutral-950/80 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
        
        {/* 1. Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <Film className="w-6 h-6 text-red-500 group-hover:rotate-12 transition-transform" />
          <span className="text-xl font-bold tracking-tighter text-white">
            Kin<span className="text-red-500">Orbia</span>
          </span>
        </Link>

        {/* 2. Desktop Links */}
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-neutral-400">
          <Link href="/reviews" className="hover:text-white transition-colors">Reviews</Link>
          <Link href="/lists" className="hover:text-white transition-colors">Lists</Link>
          <Link href="/journal" className="hover:text-white transition-colors">Journal</Link>
        </div>

        {/* 3. Search & Actions */}
        <div className="flex items-center gap-4">
          
          {/* Animated Search Bar */}
          {isSearchOpen ? (
            <form onSubmit={handleSearch} className="flex items-center bg-neutral-800 rounded-full px-3 py-1">
              <input
                type="text"
                placeholder="Search film..."
                className="bg-transparent border-none focus:outline-none text-sm text-white w-32 md:w-48"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                autoFocus
              />
              <button type="button" onClick={() => setIsSearchOpen(false)}>
                <X className="w-4 h-4 text-neutral-400 hover:text-white" />
              </button>
            </form>
          ) : (
            <button 
              onClick={() => setIsSearchOpen(true)}
              className="p-2 hover:bg-white/10 rounded-full transition"
            >
              <Search className="w-5 h-5 text-neutral-300" />
            </button>
          )}

          {/* Login Button */}
          <Link href="/login" className="p-2 hover:bg-white/10 rounded-full transition">
            <User className="w-5 h-5 text-neutral-300" />
          </Link>
        </div>
      </div>
    </nav>
  );
}