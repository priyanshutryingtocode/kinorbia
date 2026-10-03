import BrowseMediaPage, { type BrowseCopy } from "@/components/BrowseMediaPage";
import { fetchMovies } from "../actions";

// All four pages' worth of structure lives in BrowseMediaPage; this file is the
// movies vocabulary and the action to fetch with.
const COPY: BrowseCopy = {
  headingNoun: "Movies",
  ledeGenre: "Explore movies in your selected genre.",
  ledeDefault: "Trending films from around the globe",
  emptyTitle: "Couldn't load movies right now",
  emptyDescription: "Popular movies are temporarily unavailable. Refresh to try again.",
};

type Props = {
  searchParams: Promise<{ genre?: string }>;
};

export default function Home({ searchParams }: Props) {
  return (
    <BrowseMediaPage
      mediaType="movie"
      action={fetchMovies}
      copy={COPY}
      searchParams={searchParams}
    />
  );
}