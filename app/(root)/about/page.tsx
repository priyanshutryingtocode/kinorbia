import { Film, Heart, ListVideo, NotebookTabs, Star } from "lucide-react";

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-neutral-950 text-white px-6 py-16">
      <div className="max-w-5xl mx-auto">
        <header className="mb-12">
          <p className="text-red-500 text-sm font-bold uppercase tracking-widest mb-3">
            About
          </p>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tighter">KinOrbia</h1>
          <p className="text-neutral-400 mt-4 max-w-3xl text-lg leading-relaxed">
            KinOrbia is a personal film space for finding movies, saving favorites, logging what
            you watch, writing reviews, and building lists that can stay private or be shared with
            the wider community.
          </p>
        </header>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[
            {
              icon: <Film className="w-5 h-5 text-red-400" />,
              title: "Discover",
              text: "Search TMDB-powered movie data and open rich movie detail pages.",
            },
            {
              icon: <Heart className="w-5 h-5 text-red-400" />,
              title: "Collect",
              text: "Save favorite movies and use them as building blocks for reviews and lists.",
            },
            {
              icon: <NotebookTabs className="w-5 h-5 text-red-400" />,
              title: "Journal",
              text: "Track watched films, dates, ratings, and the notes you want to remember.",
            },
            {
              icon: <ListVideo className="w-5 h-5 text-red-400" />,
              title: "Curate",
              text: "Create public or private lists for moods, themes, recommendations, and watch plans.",
            },
            {
              icon: <Star className="w-5 h-5 text-red-400" />,
              title: "Review",
              text: "Publish public reviews or keep private notes on the films that matter to you.",
            },
          ].map((item) => (
            <article key={item.title} className="bg-neutral-900/50 border border-white/10 rounded-xl p-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-red-500/10 rounded-lg">{item.icon}</div>
                <h2 className="font-bold text-lg">{item.title}</h2>
              </div>
              <p className="text-sm text-neutral-400 leading-relaxed">{item.text}</p>
            </article>
          ))}
        </section>
      </div>
    </div>
  );
}
