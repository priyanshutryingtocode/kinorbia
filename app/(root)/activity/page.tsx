import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { List, MessageSquare, Star } from "lucide-react";
import type { Metadata } from "next";
import { auth } from "@/auth";
import dbConnect from "@/lib/dbConnect";
import { buildReviewerRatingMaps, lookupRating } from "@/lib/reviewRatings";
import type { MediaType } from "@/types";
import User from "@/models/User";
import MovieList from "@/models/MovieList";
import Review from "@/models/Review";
import FeedTabs from "@/components/FeedTabs";
import EmptyState from "@/components/EmptyState";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Activity",
  description: "The latest reviews and lists shared by the KinOrbia community.",
};

function posterUrl(path?: string | null) {
  return path ? `https://image.tmdb.org/t/p/w185${path}` : null;
}

type ActivityPageProps = {
  searchParams: Promise<{ feed?: string }> | { feed?: string };
};

export default async function ActivityPage({ searchParams }: ActivityPageProps) {
  const { feed } = await Promise.resolve(searchParams);
  const isFollowingFeed = feed === "following";

  const session = await auth();
  if (isFollowingFeed && !session?.user?.email) {
    redirect("/login");
  }

  await dbConnect();

  const following: string[] = [];
  if (isFollowingFeed) {
    const currentUser = await User.findOne({ email: session!.user!.email })
      .select("following")
      .lean<{ following?: string[] } | null>();
    following.push(...(currentUser?.following || []));
  }

  const scope = isFollowingFeed
    ? { userEmail: { $in: following } }
    : {};

  const [reviews, lists] = await Promise.all([
    Review.find({ visibility: "public", ...scope }).sort({ createdAt: -1 }).limit(12).lean<{
      _id: { toString: () => string };
      userName: string;
      userEmail: string;
      movieTitle: string;
      posterPath?: string;
      movieId?: string;
      mediaType?: MediaType;
      body: string;
      spoiler?: boolean;
      createdAt: Date;
    }[]>(),
    MovieList.find({ visibility: "public", ...scope }).sort({ createdAt: -1 }).limit(8).lean<{
      _id: { toString: () => string };
      userName: string;
      title: string;
      description?: string;
      movies: { posterPath?: string; title: string; movieId: string }[];
      createdAt: Date;
    }[]>(),
  ]);

  const ratingMaps = await buildReviewerRatingMaps(
    reviews.map((review) => ({
      userEmail: review.userEmail,
      movieId: review.movieId,
      mediaType: review.mediaType,
    }))
  );

  const items = [
    ...reviews.map((review) => ({ kind: "review" as const, date: review.createdAt, review })),
    ...lists.map((list) => ({ kind: "list" as const, date: list.createdAt, list })),
  ].sort((a, b) => b.date.getTime() - a.date.getTime()).slice(0, 18);

  return (
    <div className="min-h-screen px-6 py-12 text-white">
      <div className="mx-auto max-w-5xl">
        <header className="mb-10">
          <p className="mb-3 text-sm font-bold uppercase tracking-widest text-red-400">Community</p>
          <h1 className="text-4xl font-bold md:text-5xl">Activity</h1>
          <p className="mt-3 max-w-2xl text-neutral-400">
            {isFollowingFeed
              ? "Fresh reviews and lists from the members you follow."
              : "Fresh public reviews and lists from KinOrbia members."}
          </p>
          <div className="mt-6">
            <FeedTabs />
          </div>
        </header>

        {isFollowingFeed && following.length === 0 ? (
          <EmptyState
            title="You are not following anyone yet"
            description="Follow members from their profiles and their reviews and lists will show up here."
          />
        ) : items.length > 0 ? (
          <div className="space-y-4">
            {items.map((item) => item.kind === "review" ? (
              <article key={`review-${item.review._id}`} className="flex gap-4 rounded-lg border border-white/10 bg-neutral-900/50 p-4">
                <div className="relative h-24 w-16 shrink-0 overflow-hidden rounded-md bg-neutral-950">
                  {posterUrl(item.review.posterPath) ? (
                    <Image src={posterUrl(item.review.posterPath) as string} alt={item.review.movieTitle} fill sizes="64px" className="object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-neutral-700">
                      <MessageSquare className="h-5 w-5" />
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-xs uppercase tracking-widest text-neutral-500">{item.review.userName} reviewed</p>
                  <h2 className="mt-1 font-bold">{item.review.movieTitle}</h2>
                  {lookupRating(ratingMaps, item.review) > 0 && (
                    <p className="mt-1 flex items-center gap-1 text-sm font-bold text-yellow-400">
                      <Star className="h-3.5 w-3.5 fill-current" />
                      {(lookupRating(ratingMaps, item.review) / 2).toFixed(1)} stars
                    </p>
                  )}
                  {item.review.spoiler && (
                    <span className="mt-2 inline-flex rounded-full border border-yellow-500/20 bg-yellow-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-yellow-300">
                      Spoiler
                    </span>
                  )}
                  <p className={`mt-3 line-clamp-2 text-sm text-neutral-300 ${item.review.spoiler ? "select-none opacity-40 blur-sm" : ""}`}>{item.review.body}</p>
                </div>
              </article>
            ) : (
              <Link key={`list-${item.list._id}`} href={`/lists/${item.list._id}`} className="block rounded-lg border border-white/10 bg-neutral-900/50 p-4 hover:border-red-500/40">
                <p className="text-xs uppercase tracking-widest text-neutral-500">{item.list.userName} created a list</p>
                <div className="mt-2 flex items-center gap-2">
                  <List className="h-4 w-4 text-red-400" />
                  <h2 className="font-bold">{item.list.title}</h2>
                </div>
                {item.list.description && <p className="mt-3 line-clamp-2 text-sm text-neutral-300">{item.list.description}</p>}
              </Link>
            ))}
          </div>
        ) : (
          <EmptyState
            title="Nothing here yet"
            description={isFollowingFeed ? "Members you follow haven't shared anything recently." : "Be the first to share a review or list."}
          />
        )}
      </div>
    </div>
  );
}
