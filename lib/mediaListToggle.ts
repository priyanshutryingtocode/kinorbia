import User from "@/models/User";
import { mediaEquals, normalizeMediaType } from "@/lib/media";
import type { MediaType } from "@/types";

type EmbeddedMediaToggle = "added" | "removed" | "full" | "missing";


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
