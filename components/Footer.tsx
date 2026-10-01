import Link from "next/link";
import { Film } from "lucide-react";
import PageContainer from "./PageContainer";

export default function Footer() {
  return (
    <footer className="border-t border-ink-rule bg-ink pt-12 pb-[calc(5rem+env(safe-area-inset-bottom))] text-ink-muted">
      <PageContainer className="grid grid-cols-1 gap-10 md:grid-cols-4">
        <div className="space-y-4">
          <Link href="/" className="kin-focus flex w-fit items-center gap-2 rounded-control text-ink-content">
            <span className="grid h-9 w-9 place-items-center rounded-control border border-accent-bright/30 bg-accent-bright/10 text-accent-bright">
              <Film className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="font-display text-xl font-medium">
              Kin<span className="text-accent-bright">Orbia</span>
            </span>
          </Link>
          <p className="text-sm leading-relaxed">
            The social network for film lovers. Track what you watch, tell your friends what is good.
          </p>
        </div>

        <nav aria-labelledby="footer-explore">
          <h2 id="footer-explore" className="kin-overline mb-4 text-highlight-vivid">Explore</h2>
          <ul className="space-y-1 text-sm">
            <li><Link href="/search" className="kin-focus inline-flex min-h-9 items-center rounded-control px-1 transition hover:text-accent-bright">Search Movies</Link></li>
            <li><Link href="/reviews" className="kin-focus inline-flex min-h-9 items-center rounded-control px-1 transition hover:text-accent-bright">Reviews</Link></li>
            <li><Link href="/lists" className="kin-focus inline-flex min-h-9 items-center rounded-control px-1 transition hover:text-accent-bright">Lists</Link></li>
          </ul>
        </nav>

        <nav aria-labelledby="footer-community">
          <h2 id="footer-community" className="kin-overline mb-4 text-highlight-vivid">Community</h2>
          <ul className="space-y-1 text-sm">
            <li><Link href="/about" className="kin-focus inline-flex min-h-9 items-center rounded-control px-1 transition hover:text-accent-bright">About</Link></li>
          </ul>
        </nav>

        <div>
          <h2 className="kin-overline mb-4 text-highlight-vivid">Credits</h2>
          <p className="mt-6 text-xs leading-5 text-ink-subtle">
            &copy; {new Date().getFullYear()} KinOrbia. <br /> Data provided by TMDB. <br /> Made by Priyanshu Srivastava
          </p>
        </div>
      </PageContainer>
    </footer>
  );
}
