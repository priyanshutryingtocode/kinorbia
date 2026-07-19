import Link from "next/link";
import { Film } from "lucide-react";

export default function Footer() {
  return (
    <footer className="border-t border-white/10 bg-neutral-950 text-neutral-400 py-12 mt-20">
      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-10">
        <div className="space-y-4">
          <Link href="/" className="flex items-center gap-2 group">
            <Film className="w-6 h-6 text-red-500" />
            <span className="text-xl font-bold tracking-tighter text-white">
              Kin<span className="text-red-500">Orbia</span>
            </span>
          </Link>
          <p className="text-sm leading-relaxed">
            The social network for film lovers. Track what you watch, tell your friends what is good.
          </p>
        </div>

        <div>
          <h3 className="text-white font-semibold mb-4">Explore</h3>
          <ul className="space-y-2 text-sm">
            <li><Link href="/search" className="hover:text-red-500 transition">Search Movies</Link></li>
            <li><Link href="/reviews" className="hover:text-red-500 transition">Reviews</Link></li>
            <li><Link href="/lists" className="hover:text-red-500 transition">Lists</Link></li>
            <li><Link href="/journal" className="hover:text-red-500 transition">Journal</Link></li>
          </ul>
        </div>

        <div>
          <h3 className="text-white font-semibold mb-4">Community</h3>
          <ul className="space-y-2 text-sm">
            <li><Link href="/about" className="hover:text-red-500 transition">About</Link></li>
          </ul>
        </div>

        <div>
          <h3 className="text-white font-semibold mb-4">Credits</h3>
          <p className="mt-6 text-xs text-neutral-600">
            &copy; {new Date().getFullYear()} KinOrbia. <br/> Data provided by TMDB. <br/> Made by Priyanshu Srivastava
          </p>
        </div>
      </div>
    </footer>
  );
}
