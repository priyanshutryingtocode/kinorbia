import RouteShell from "@/components/RouteShell";
import PageHeader from "@/components/PageHeader";
import SectionHeader from "@/components/SectionHeader";

const features = [
  {
    number: "01",
    title: "Discover",
    text: "Search TMDB-powered movie/show data and open rich detailed pages.",
  },
  {
    number: "02",
    title: "Collect",
    text: "Save favorite movies/shows and use them as building blocks for reviews and lists.",
  },
  {
    number: "03",
    title: "Journal",
    text: "Track watched films/shows, dates, ratings, and the notes you want to remember.",
  },
  {
    number: "04",
    title: "Curate",
    text: "Create public or private lists for moods, themes, recommendations, and watch plans.",
  },
  {
    number: "05",
    title: "Review",
    text: "Publish public reviews or keep private notes on the films and shows that matter to you.",
  },
] as const;

export default function AboutPage() {
  return (
    <RouteShell spacing="standard" width="standard">
      <PageHeader
        eyebrow="About"
        title="KinOrbia"
        description="KinOrbia is a personal film space for finding movies, saving favorites, logging what you watch, writing reviews, and building lists that can stay private or be shared with the wider community."
        className="mb-10"
      />

      <SectionHeader id="features" title="Features" className="mb-6" />

      <ol className="kin-editorial-list">
        {features.map(({ number, title, text}) => (
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
    </RouteShell>
  );
}
