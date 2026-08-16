import Image from "next/image";
import Link from "next/link";
import { List, MessageSquare, Star } from "lucide-react";
import type { Metadata } from "next";
import dbConnect from "@/lib/dbConnect";
import MovieList from "@/models/MovieList";
import Review from "@/models/Review";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Activity",
  description: "The latest reviews and lists shared by the KinOrbia community.",
};

function posterUrl(path?: string | null) {
  return path ? `https://image.tmdb.org/t/p/w185${path}` : null;
}

export default async function ActivityPage() {
  await dbConnect();
  const [reviews, lists] = await Promise.all([
    Review.find({ visibility: "public" }).sort({ createdAt: -1 }).limit(12).lean<{
      _id: { toString: () => string };
      userName: string;
      movieTitle: string;
      posterPath?: string;
      rating: number;
      body: string;
      createdAt: Date;
    }[]>(),
    MovieList.find({ visibility: "public" }).sort({ createdAt: -1 }).limit(8).lean<{
      _id: { toString: () => string };
      userName: string;
      title: string;
      description?: string;
      movies: { posterPath?: string; title: string; movieId: string }[];
      createdAt: Date;
    }[]>(),
  ]);

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
          <p className="mt-3 max-w-2xl text-neutral-400">Fresh public reviews and lists from KinOrbia members.</p>
        </header>

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
                <p className="mt-1 flex items-center gap-1 text-sm font-bold text-yellow-400">
                  <Star className="h-3.5 w-3.5 fill-current" />
                  {(item.review.rating / 2).toFixed(1)} stars
                </p>
                <p className="mt-3 line-clamp-2 text-sm text-neutral-300">{item.review.body}</p>
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
      </div>
    </div>
  );
}
