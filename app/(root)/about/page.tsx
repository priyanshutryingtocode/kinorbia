import RouteShell from "@/components/RouteShell";
import PageHeader from "@/components/PageHeader";
import SectionHeader from "@/components/SectionHeader";

const features = [
  {
    number: "01",
    title: "Discover",
    text: "Search movies and shows, browse by genre, or start from something you have already seen and pick up recommendations from there.",
  },
  {
    number: "02",
    title: "Collect",
    text: "Favourites and a watchlist, each keeping the date you added it, so your shelves stay in the order you actually built them.",
  },
  {
    number: "03",
    title: "Track",
    text: "Mark what you have watched and KinOrbia holds the date, builds your streaks, and never restamps a title just because you rewatched it.",
  },
  {
    number: "04",
    title: "Rate",
    text: "Rate anything you have watched out of ten, or half a star to five. Your first date is the one that counts, so a rewatch never moves it.",
  },
  {
    number: "05",
    title: "Review",
    text: "Write about a title you have rated, publicly or privately. Reviews hang off a rated favourite rather than a typed-in title, so what you read always has your number behind it.",
  },
  {
    number: "06",
    title: "Curate",
    text: "Build lists for a mood, a theme, or something to watch with friends. Public or private, and fixing a typo never reshuffles the whole list.",
  },
  {
    number: "07",
    title: "Connect",
    text: "Follow other members, like and comment, and read one activity feed that follows reviews and lists from the people you chose.",
  },
  {
    number: "08",
    title: "Ask",
    text: "A chat assistant that answers from your own favourites and watch history rather than the whole catalogue, so it knows what you have already seen.",
  },
] as const;

export default function AboutPage() {
  return (
    <RouteShell spacing="standard" width="standard">
      <PageHeader
        eyebrow="About"
        title="KinOrbia"
        description="A personal film space for finding something to watch, keeping track of what you have seen, and writing about the ones that stayed with you. Everything you save is yours: public when you want it shared, private when you do not."
        className="mb-10"
      />

      <SectionHeader id="features" title="What you can do" className="mb-6" />

      <ol className="kin-editorial-list">
        {features.map(({ number, title, text }) => (
          <li key={title} className="kin-editorial-row gap-4 py-6 transition-colors hover:bg-surface/40 sm:gap-6">
            <div className="flex w-14 shrink-0 items-center gap-3 text-highlight sm:w-20">
              <span className="font-display text-2xl leading-none" aria-hidden="true">
                {number}
              </span>
            </div>
            <div className="grid min-w-0 flex-1 gap-2 sm:grid-cols-[7rem_minmax(0,1fr)] sm:gap-6">
              <h3 className="font-display text-xl font-medium leading-tight text-content">
                {title}
              </h3>
              <p className="max-w-2xl wrap-break-word text-sm leading-6 text-content-muted">
                {text}
              </p>
            </div>
          </li>
        ))}
      </ol>

      <section aria-labelledby="about-data-heading" className="mt-12">
        <h2 id="about-data-heading" className="kin-overline mb-3 text-highlight-muted">
          About the data
        </h2>
        <div className="max-w-2xl space-y-3 text-sm leading-6 text-content-muted">
          <p>
            Titles, artwork, ratings and release dates come from TMDB.
          </p>
        </div>
      </section>
    </RouteShell>
  );
}