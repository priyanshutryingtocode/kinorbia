import type { Metadata } from "next";
import BrowseMediaPage, { type BrowseCopy } from "@/components/BrowseMediaPage";
import { fetchMovies } from "../../actions";

export const metadata: Metadata = {
  title: "Movies",
  description: "Browse popular movies across genres on KinOrbia.",
};

const COPY: BrowseCopy = {
  headingNoun: "Movies",
  ledeGenre: "Explore movies in your selected genre.",
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