import { auth } from "@/auth";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import MovieCard, { type MovieProp } from "@/components/MovieCard";
import { getRecommendations } from "@/lib/tmdb";
import type { MediaType } from "@/types";
import { emailMatch } from "@/lib/emailMatch";

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
    { $match: { email: emailMatch(email) } },
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
  const data = await getRecommendations(favorite.movieId, mediaType);

  const recommendations: MovieProp[] = (data?.results || []).slice(0, 5);
  if (recommendations.length === 0) return null;

  return (
    // A strip, not a second hero. This used to carry a 3xl/4xl display-serif
    // heading that rivalled the page's <h1>; it is now one small label plus a
    // quiet subtitle on a single line. The <h2> stays so the region is still
    // announced in the document outline -- it is just styled like a label.
    <section className="mb-10 border-t border-rule pt-8">
      <div className="mb-5 flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <h2 className="kin-overline text-highlight">Recommended</h2>
        <p className="text-sm text-content-subtle">
          because you liked{" "}
          <span className="italic text-content-muted">{favorite.title}</span>
        </p>
      </div>
      {/* Five cards in a two-column grid left a row holding one poster on
          mobile, every time. Below `md` this is a horizontal snap strip instead
          -- one row, nothing ragged -- and from `md` up it is the 5-across grid
          again. The negative margin lets the strip bleed to the screen edge on
          mobile, matching the container's `px-4 sm:px-6`; `md:mx-0 md:px-0`
          undoes it once the grid takes over. `hide-scrollbar` is the existing
          utility, since the snap affordance replaces the scrollbar. */}
      <div className="-mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 hide-scrollbar sm:-mx-6 sm:px-6 md:mx-0 md:grid md:grid-cols-5 md:gap-6 md:overflow-visible md:px-0">
        {recommendations.map((movie, index) => (
          <div
            key={movie.id}
            className="w-[44vw] max-w-44 shrink-0 snap-start md:w-auto md:max-w-none"
          >
            <MovieCard movie={movie} loading={index === 0 ? "eager" : undefined} />
          </div>
        ))}
      </div>
    </section>
  );
}
