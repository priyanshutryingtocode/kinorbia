import Link from "next/link";
import { Film } from "lucide-react";
import PageContainer from "./PageContainer";
import { FOOTER_LINK_CLASS } from "@/lib/uiClasses";

export default function Footer() {
  return (
    /* kin-ink-band re-points the palette for everything inside, so none of the
       colour classes below name an ink token: `text-content`, `text-highlight`
       and `text-accent` resolve to their dark-ground values here and to their
       light ones everywhere else. Same reason the fill is opaque rather than
       /80 -- see the note on .shell-header. */
    <footer className="kin-ink-band border-t border-rule bg-chrome pt-12 pb-[calc(5rem+env(safe-area-inset-bottom))] text-content-muted backdrop-blur-xl">
      <PageContainer className="grid grid-cols-1 gap-10 md:grid-cols-4">
        <div className="space-y-4">
          <Link href="/" className="kin-focus flex w-fit items-center gap-2 rounded-control text-content">
            <span className="grid h-9 w-9 place-items-center rounded-control border border-accent/20 bg-accent/10 text-accent-text">
              <Film className="h-5 w-5" aria-hidden="true" />
            </span>
            <span className="font-display text-xl font-medium">
              Kin<span className="text-accent">Orbia</span>
            </span>
          </Link>
          <p className="text-sm leading-relaxed">
            The social network for film lovers. Track what you watch, tell your friends what is good.
          </p>
        </div>

        <nav aria-labelledby="footer-explore">
          <h2 id="footer-explore" className="kin-overline mb-4 text-highlight">Explore</h2>
          <ul className="space-y-1 text-sm">
            <li><Link href="/search" className={FOOTER_LINK_CLASS}>Search Movies</Link></li>
            <li><Link href="/reviews" className={FOOTER_LINK_CLASS}>Reviews</Link></li>
            <li><Link href="/lists" className={FOOTER_LINK_CLASS}>Lists</Link></li>
          </ul>
        </nav>

        <nav aria-labelledby="footer-community">
          <h2 id="footer-community" className="kin-overline mb-4 text-highlight">Community</h2>
          <ul className="space-y-1 text-sm">
            <li><Link href="/about" className={FOOTER_LINK_CLASS}>About</Link></li>
          </ul>
        </nav>

        <div>
          <h2 className="kin-overline mb-4 text-highlight">Credits</h2>
          <p className="mt-6 text-xs leading-5 text-content-muted">
            &copy; {new Date().getFullYear()} KinOrbia. <br /> Data provided by TMDB. <br /> Made by Priyanshu Srivastava
          </p>
        </div>
      </PageContainer>
    </footer>
  );
}
