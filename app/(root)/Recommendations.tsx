import { auth } from "@/auth";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import MovieCard, { type MovieProp } from "@/components/MovieCard";
import { getRecommendationMovies, getTvRecommendations } from "@/lib/tmdb";
import type { MediaType } from "@/types";

type SourceFavorite = { movieId: string; title: string };

// The newest favorite *of one media type*, resolved in the database.
//
// `$slice: -1` on its own takes the newest entry regardless of type, which is
// how the movies page used to end up recommending shows. Filtering after a
// fixed-width slice does not work either: a user with 100 movie favorites and
// one old show would have no show in the last 20, so the shows panel would
// never appear. Filter the array first, then take its last element.
async function latestFavoriteOfType(email: string, mediaType: MediaType) {
  const [row] = await User.aggregate<{ favorites?: SourceFavorite[] }>([
    { $match: { email } },
    {
      $project: {
        favorites: {
          $slice: [
            {
              $filter: {
                input: { $ifNull: ["$favorites", []] },
                as: "favorite",
                // The subdocument defaults mediaType to "movie", so this should
                // always match; $ifNull keeps a favorite that predates the
                // field from being silently dropped on the movie side.
                cond: { $eq: [{ $ifNull: ["$$favorite.mediaType", "movie"] }, mediaType] },
              },
            },
            -1,
          ],
        },
      },
    },
  ]);

  return row?.favorites?.at(0) ?? null;
}

export default async function Recommendations({ mediaType }: { mediaType: MediaType }) {
  const session = await auth();
  if (!session?.user?.email) return null;

  await dbConnect();
  const favorite = await latestFavoriteOfType(session.user.email, mediaType);
  // No favorite of this type: hide the panel rather than fall back to something
  // unrelated to the viewer.
  if (!favorite) return null;

  // The page's media type picks the endpoint, so a show never seeds the movies
  // panel or the reverse.
  const data =
    mediaType === "tv"
      ? await getTvRecommendations(favorite.movieId)
      : await getRecommendationMovies(favorite.movieId);

  const recommendations: MovieProp[] = (data?.results || []).slice(0, 5);
  if (recommendations.length === 0) return null;

  return (
    <section className="mb-14 border-b border-white/5 pb-10">
      <div className="mb-6 flex flex-col gap-2">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-gold">
          Recommended
        </p>
        <h2 className="font-display text-3xl font-bold leading-tight text-white md:text-4xl">
          Because you liked <span className="italic font-normal text-neutral-200">{favorite.title}</span>
        </h2>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
        {recommendations.map((movie, index) => (
          <MovieCard key={movie.id} movie={movie} loading={index === 0 ? "eager" : undefined} />
        ))}
      </div>
    </section>
  );
}
