import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ListPlus, ListVideo, Plus } from "lucide-react";
import { auth } from "@/auth";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import MovieList from "@/models/MovieList";
import { createMovieList, deleteMovieList, updateMovieList } from "./actions";
import type { FavoriteMovie, MovieListItem } from "@/types";

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
  return path ? `https://image.tmdb.org/t/p/w185${path}` : null;
}

export default async function ListsPage() {
  const session = await auth();
  if (!session?.user?.email) {
    redirect("/login");
  }
  const currentUserEmail = session.user.email;

  await dbConnect();

  const rawLists = await MovieList.find({
    $or: [
      { visibility: "public" },
      { visibility: { $exists: false } },
      { userEmail: currentUserEmail },
    ],
  })
    .sort({ createdAt: -1 })
    .limit(18)
    .lean<RawMovieList[]>();
  const lists = rawLists.map(serializeList);

  const user = await User.findOne({ email: currentUserEmail }).lean<{
    favorites?: FavoriteMovie[];
  } | null>();
  const favorites = (user?.favorites || []) as FavoriteMovie[];

  return (
    <div className="min-h-screen bg-neutral-950 text-white px-6 py-12">
      <div className="max-w-7xl mx-auto">
        <header className="mb-10">
          <p className="text-red-500 text-sm font-bold uppercase tracking-widest mb-3">
            Collections
          </p>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tighter">Community Lists</h1>
          <p className="text-neutral-400 mt-3 max-w-2xl">
            Build themed shelves from your favorites: comfort watches, sharp thrillers, date-night picks, or anything in between.
          </p>
        </header>

        <section className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-8">
          <aside className="bg-neutral-900/50 border border-white/10 rounded-xl p-5 h-fit">
            <div className="flex items-center gap-3 mb-5">
              <div className="p-2 bg-red-500/10 rounded-lg">
                <ListPlus className="w-5 h-5 text-red-400" />
              </div>
              <h2 className="font-bold text-lg">Create a List</h2>
            </div>

            {favorites.length > 0 ? (
                <form action={createMovieList} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">
                      List Title
                    </label>
                    <input
                      name="title"
                      required
                      maxLength={80}
                      placeholder="Friday night thrillers"
                      className="w-full bg-neutral-950 border border-white/10 rounded-lg px-3 py-3 text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-red-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">
                      Description
                    </label>
                    <textarea
                      name="description"
                      maxLength={300}
                      rows={3}
                      placeholder="A short note about the vibe."
                      className="w-full bg-neutral-950 border border-white/10 rounded-lg px-3 py-3 text-sm text-white placeholder:text-neutral-600 focus:outline-none focus:border-red-500 resize-none"
                    />
                  </div>

                  <div>
                    <p className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">
                      Movies
                    </p>
                    <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
                      {favorites.map((movie) => (
                        <label
                          key={movie.movieId}
                          className="flex items-center gap-3 bg-neutral-950 border border-white/10 rounded-lg px-3 py-2 cursor-pointer hover:border-red-500/50"
                        >
                          <input
                            type="checkbox"
                            name="movieIds"
                            value={movie.movieId}
                            className="accent-red-600"
                          />
                          <span className="text-sm text-neutral-200 truncate">{movie.title}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <fieldset>
                    <legend className="block text-xs font-bold text-neutral-500 uppercase tracking-wider mb-2">
                      Visibility
                    </legend>
                    <div className="grid grid-cols-2 gap-2">
                      <label className="flex items-center gap-2 bg-neutral-950 border border-white/10 rounded-lg px-3 py-3 text-sm cursor-pointer hover:border-red-500/50">
                        <input
                          type="radio"
                          name="visibility"
                          value="public"
                          defaultChecked
                          className="accent-red-600"
                        />
                        Public
                      </label>
                      <label className="flex items-center gap-2 bg-neutral-950 border border-white/10 rounded-lg px-3 py-3 text-sm cursor-pointer hover:border-red-500/50">
                        <input
                          type="radio"
                          name="visibility"
                          value="private"
                          className="accent-red-600"
                        />
                        Private
                      </label>
                    </div>
                  </fieldset>

                  <button className="w-full bg-red-600 hover:bg-red-500 text-white font-bold py-3 rounded-lg transition flex items-center justify-center gap-2">
                    <Plus className="w-4 h-4" />
                    Create List
                  </button>
                </form>
              ) : (
                <div className="text-sm text-neutral-400">
                  <p className="mb-4">Add movies to your favorites before creating lists.</p>
                  <Link href="/" className="text-red-400 hover:text-red-300 font-medium">
                    Browse movies
                  </Link>
                </div>
            )}
          </aside>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {lists.length > 0 ? (
              lists.map((list) => (
                <article key={list._id} className="bg-neutral-900/50 border border-white/10 rounded-xl p-5">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div>
                      <Link href={`/lists/${list._id}`} className="text-xl font-bold text-white hover:text-red-400 transition">
                        {list.title}
                      </Link>
                      <p className="text-xs text-neutral-500 mt-1">
                        by {list.userName} - {new Date(list.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs text-neutral-400 bg-white/5 border border-white/10 rounded-full px-3 py-1">
                      {list.movies.length} films
                    </span>
                    <span
                      className={`shrink-0 text-[11px] font-bold uppercase tracking-wider rounded-full px-3 py-1 ${
                        list.visibility === "private"
                          ? "bg-white/10 text-neutral-300 border border-white/10"
                          : "bg-red-500/10 text-red-300 border border-red-500/20"
                      }`}
                    >
                      {list.visibility}
                    </span>
                  </div>

                  {list.description && (
                    <p className="text-sm text-neutral-300 leading-relaxed mb-4">{list.description}</p>
                  )}

                  <div className="grid grid-cols-5 gap-2">
                    {list.movies.slice(0, 5).map((movie) => (
                      <div key={movie.movieId} className="relative aspect-2/3 bg-neutral-950 rounded-md overflow-hidden">
                        {posterUrl(movie.posterPath) ? (
                          <Image
                            src={posterUrl(movie.posterPath) as string}
                            alt={movie.title}
                            fill
                            sizes="80px"
                            className="object-cover"
                          />
                        ) : (
                          <div className="h-full flex items-center justify-center text-neutral-700">
                            <ListVideo className="w-5 h-5" />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  {list.userEmail === currentUserEmail && (
                    <details className="mt-4 border-t border-white/10 pt-4">
                      <summary className="cursor-pointer text-xs font-bold uppercase tracking-wider text-neutral-400 hover:text-white">
                        Manage
                      </summary>
                      <form action={updateMovieList} className="mt-4 space-y-3">
                        <input type="hidden" name="listId" value={list._id} />
                        <input
                          name="title"
                          required
                          maxLength={80}
                          defaultValue={list.title}
                          className="w-full bg-neutral-950 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500"
                        />
                        <textarea
                          name="description"
                          maxLength={300}
                          rows={3}
                          defaultValue={list.description}
                          className="w-full bg-neutral-950 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500 resize-none"
                        />
                        <select
                          name="visibility"
                          defaultValue={list.visibility}
                          className="w-full bg-neutral-950 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-red-500"
                        >
                          <option value="public">Public</option>
                          <option value="private">Private</option>
                        </select>
                        <button className="w-full bg-white/10 hover:bg-white/15 text-white font-bold py-2 rounded-lg transition">
                          Save List
                        </button>
                      </form>
                      <form action={deleteMovieList} className="mt-2">
                        <input type="hidden" name="listId" value={list._id} />
                        <button className="w-full border border-red-500/30 text-red-300 hover:bg-red-500/10 font-bold py-2 rounded-lg transition">
                          Delete List
                        </button>
                      </form>
                    </details>
                  )}
                </article>
              ))
            ) : (
              <div className="md:col-span-2 border border-dashed border-white/10 rounded-xl p-10 text-center text-neutral-500">
                No lists yet. Create the first collection from your favorites.
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
