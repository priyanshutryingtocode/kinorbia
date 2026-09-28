import User from "@/models/User";
import { mediaEquals, normalizeMediaType } from "@/lib/media";
import type { MediaType } from "@/types";

type EmbeddedMediaToggle = "added" | "removed" | "full" | "missing";

// The add-first toggle that both `POST /api/user/favorites` and
// `POST /api/user/watchlist` were written as, in full, twice.
//
// Both do the same two guarded updates, and the guards are the part worth
// having exactly one copy of:
//
//   1. An add whose filter asserts "not already present" *and* "below capacity",
//      so a concurrent pair of requests can neither create a duplicate entry nor
//      push past the cap -- whichever update wins decides the resulting state.
//   2. A pull, only if step 1 changed nothing.
//   3. Otherwise the cap (or a missing user) is the explanation.
//
// What deliberately stays with each caller: the response shape, the rate limit,
// and the wording. Those differ between the two routes and folding them in
// would turn this into a bag of knobs.
export async function toggleEmbeddedMedia({
  email,
  field,
  max,
  entry,
  movieId,
  mediaType,
}: {
  email: string;
  field: "favorites" | "watchlist";
  max: number;
  entry: Record<string, unknown>;
  movieId: string;
  mediaType: MediaType;
}): Promise<EmbeddedMediaToggle> {
  const media = mediaEquals(normalizeMediaType(mediaType));

  const added = await User.updateOne(
    {
      email,
      [field]: { $not: { $elemMatch: { movieId, mediaType: media } } },
      $expr: { $lt: [{ $size: { $ifNull: [`$${field}`, []] } }, max] },
    },
    { $push: { [field]: { movieId, mediaType: normalizeMediaType(mediaType), ...entry } } }
  );

  if (added.modifiedCount > 0) {
    return "added";
  }

  const removed = await User.updateOne(
    { email, [field]: { $elemMatch: { movieId, mediaType: media } } },
    { $pull: { [field]: { movieId, mediaType: media } } }
  );

  if (removed.modifiedCount > 0) {
    return "removed";
  }

  const userExists = await User.exists({ email });
  return userExists ? "full" : "missing";
}
