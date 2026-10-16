import type { Metadata } from "next";
import BrowseMediaPage, { type BrowseCopy } from "@/components/BrowseMediaPage";
import { fetchMovies } from "../../actions";

export const metadata: Metadata = {
  title: "Movies",
  description: "Browse popular movies across genres on KinOrbia.",
};

// All four pages' worth of structure lives in BrowseMediaPage; this file is the
// movies vocabulary and the action to fetch with.
const COPY: BrowseCopy = {
  headingNoun: "Movies",
  ledeGenre: "Explore movies in your selected genre.",
  // Was "Trending films from around the globe", which stopped being true when trending
  // became its own page at /. This list is TMDB's popularity ordering, not the trending one.
  ledeDefault: "Popular films from around the globe",
  emptyTitle: "Couldn't load movies right now",
  emptyDescription: "Popular movies are temporarily unavailable. Refresh to try again.",
};

type Props = {
  searchParams: Promise<{ genre?: string }>;
};

export default function Movies({ searchParams }: Props) {
  return (
    <BrowseMediaPage
      mediaType="movie"
      action={fetchMovies}
      copy={COPY}
      searchParams={searchParams}
    />
  );
}