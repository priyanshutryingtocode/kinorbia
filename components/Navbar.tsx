import Link from "next/link";
import { Film, Search, User, Menu } from "lucide-react";



export default function Navbar() {
  return (
    <nav className="fixed top-0 w-full z-50 border-b border-white/10 bg-neutral-950/80 backdrop-blur-md pointer-events-none">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between pointer-events-auto">
        
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 group">
          <Film className="w-6 h-6 text-red-500 group-hover:rotate-12 transition-transform" />
          <span className="text-xl font-bold tracking-tighter text-white">
            Kin<span className="text-red-500">Orbia</span>
          </span>
        </Link>

        {/* Desktop Links */}
        <div className="hidden md:flex items-center gap-8 text-sm font-medium text-neutral-400">
          <Link href="/reviews" className="hover:text-white transition-colors">
            Reviews
          </Link>
          <Link href="/lists" className="hover:text-white transition-colors">
            Lists
          </Link>
          <Link href="/journal" className="hover:text-white transition-colors">
            Journal
          </Link>
        </div>

        {/* Action Icons */}
        <div className="flex items-center gap-4">
          <button className="p-2 hover:bg-white/10 rounded-full transition">
            <Search className="w-5 h-5 text-neutral-300" />
          </button>
          
          <Link href="/login" className="p-2 hover:bg-white/10 rounded-full transition">
            <User className="w-5 h-5 text-neutral-300" />
          </Link>

          {/* Mobile Menu Button */}
          <button className="md:hidden p-2 text-neutral-300">
            <Menu className="w-6 h-6" />
          </button>
        </div>
      </div>
    </nav>
  );
}