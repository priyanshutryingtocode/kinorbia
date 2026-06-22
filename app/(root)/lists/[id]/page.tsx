import Image from "next/image";
import Link from "next/link";
import mongoose from "mongoose";
import { redirect, notFound } from "next/navigation";
import { Film, ListVideo } from "lucide-react";
import { auth } from "@/auth";
import dbConnect from "@/lib/dbConnect";
import MovieList from "@/models/MovieList";
import type { MovieListItem } from "@/types";

type RawMovieList = Omit<MovieListItem, "_id" | "createdAt"> & {
  _id: { toString: () => string };
  createdAt: Date;
};

function serializeList(list: RawMovieList): MovieListItem {
  return {
    _id: list._id.toString(),
    userEmail: list.userEmail,
    userName: list.userName,
    title: list.title,
    description: list.description,
    movies: list.movies,
    visibility: list.visibility || "public",
    createdAt: list.createdAt.toISOString(),
  };
}

function posterUrl(path?: string | null) {
  return path ? `https://image.tmdb.org/t/p/w342${path}` : null;
}

type ListDetailPageProps = {
  params: Promise<{ id: string }> | { id: string };
};

export default async function ListDetailPage({ params }: ListDetailPageProps) {
  const session = await auth();
  if (!session?.user?.email) {
    redirect("/login");
  }

  const { id } = await Promise.resolve(params);
  if (!mongoose.Types.ObjectId.isValid(id)) {
    notFound();
  }

  await dbConnect();
  const rawList = await MovieList.findOne({
    _id: id,
    $or: [
      { visibility: "public" },
      { visibility: { $exists: false } },
      { userEmail: session.user.email },
    ],
  }).lean<RawMovieList | null>();

  if (!rawList) {
    notFound();
  }

  const list = serializeList(rawList);

  return (
    <div className="min-h-screen bg-neutral-950 text-white px-6 py-12">
      <div className="max-w-6xl mx-auto">
        <Link href="/lists" className="text-sm text-neutral-400 hover:text-red-400 transition">
          Back to lists
        </Link>

        <header className="mt-8 mb-10">
          <div className="flex flex-wrap items-center gap-3 mb-3">
            <p className="text-red-500 text-sm font-bold uppercase tracking-widest">List</p>
            <span
              className={`text-[11px] font-bold uppercase tracking-wider rounded-full px-3 py-1 ${
                list.visibility === "private"
                  ? "bg-white/10 text-neutral-300 border border-white/10"
                  : "bg-red-500/10 text-red-300 border border-red-500/20"
              }`}
            >
              {list.visibility}
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tighter">{list.title}</h1>
          <p className="text-xs text-neutral-500 mt-3">
            by {list.userName} - {new Date(list.createdAt).toLocaleDateString()}
          </p>
          {list.description && (
            <p className="text-neutral-300 mt-5 max-w-3xl leading-relaxed">{list.description}</p>
          )}
        </header>

        {list.movies.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-5">
            {list.movies.map((movie) => (
              <Link
                key={movie.movieId}
                href={`/movie/${movie.movieId}`}
                className="group bg-neutral-900/50 border border-white/10 rounded-xl overflow-hidden hover:border-red-500/40 transition"
              >
                <div className="relative aspect-2/3 bg-neutral-900">
                  {posterUrl(movie.posterPath) ? (
                    <Image
                      src={posterUrl(movie.posterPath) as string}
                      alt={movie.title}
                      fill
                      sizes="(min-width: 1024px) 20vw, (min-width: 768px) 25vw, 50vw"
                      className="object-cover group-hover:opacity-80 transition"
                    />
                  ) : (
                    <div className="h-full flex items-center justify-center text-neutral-700">
                      <Film className="w-8 h-8" />
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <p className="text-sm font-medium truncate group-hover:text-red-400 transition">
                    {movie.title}
                  </p>
                  <p className="text-xs text-neutral-500 mt-1">
                    {movie.releaseDate ? new Date(movie.releaseDate).getFullYear() : "N/A"}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="border border-dashed border-white/10 rounded-xl p-10 text-center text-neutral-500">
            <ListVideo className="w-10 h-10 mx-auto mb-3 opacity-40" />
            This list has no movies yet.
          </div>
        )}
      </div>
    </div>
  );
}
