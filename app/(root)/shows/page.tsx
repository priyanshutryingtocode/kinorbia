import type { Metadata } from "next";
import BrowseMediaPage, { type BrowseCopy } from "@/components/BrowseMediaPage";
import { fetchTvShows } from "../../actions";

export const metadata: Metadata = {
  title: "TV Shows",
  description: "Browse popular TV shows across genres on KinOrbia.",
};

// The shows vocabulary. Everything structural is shared with /movies.
const COPY: BrowseCopy = {
  headingNoun: "Shows",
  ledeGenre: "Explore TV shows in your selected genre.",
  ledeDefault: "Trending shows from around the globe",
  emptyTitle: "Couldn't load shows right now",
  emptyDescription: "Popular shows are temporarily unavailable. Refresh to try again.",
};

type Props = {
  searchParams: Promise<{ genre?: string }>;
};

export default function Shows({ searchParams }: Props) {
  return (
    <BrowseMediaPage
      mediaType="tv"
      action={fetchTvShows}
      copy={COPY}
      searchParams={searchParams}
    />
  );
}