
import { countLabel } from "@/lib/media";
import "server-only";

import dbConnect from "@/lib/dbConnect";
import { listUserMediaRows } from "@/features/media/userMovie";
import { visibleTo } from "@/lib/visibility";
import { buildUsernameMap } from "@/lib/profileLinks";
import { INDEX_PAGE_SIZES, paginate } from "@/lib/pagination";
import { serializeList, type RawMovieList } from "@/features/lists/serializers";
import MovieList from "@/models/MovieList";
import type { MovieListItem, PickerItem } from "@/types";

type ListIndex = {
  lists: MovieListItem[];
  favorites: PickerItem[];
  usernames: Map<string, string>;
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
};

export async function getListIndex(
  currentUserEmail: string,
  requestedPage: number
): Promise<ListIndex> {
  await dbConnect();

  const [listPage, favorites] = await Promise.all([
    paginate<RawMovieList>(
      MovieList,
      visibleTo(currentUserEmail),
      { createdAt: -1, _id: -1 },
      requestedPage,
      INDEX_PAGE_SIZES.lists
    ),

    listUserMediaRows(currentUserEmail, "favorite").then((rows) =>
      rows.map(({ movieId, mediaType, title, releaseDate }) => ({
        movieId,
        mediaType,
        title,
        releaseDate: releaseDate ?? undefined,
      }))
    ),
  ]);

  const { rows, ...bounds } = listPage;
  const lists = rows.map(serializeList);

  const usernames = await buildUsernameMap(lists.map((list) => list.userEmail));

  return {
    lists,
    favorites,
    usernames,
    ...bounds,
    pageSize: INDEX_PAGE_SIZES.lists,
  };
}

type ListDetail = {
  list: ReturnType<typeof serializeList>;
  usernames: Map<string, string>;
  countLabel: string;
};

export async function getListDetail(
  listId: string,
  currentUserEmail: string | null
): Promise<ListDetail | null> {
  await dbConnect();

  const rawList = await MovieList.findOne({ _id: listId, ...visibleTo(currentUserEmail) })
    .session(null)
    .lean<RawMovieList | null>();

  if (!rawList) {
    return null;
  }

  const list = serializeList(rawList);

  return {
    list,
    usernames: await buildUsernameMap([list.userEmail]),
    countLabel: countLabel(list.movies.length, "title"),
  };
}
