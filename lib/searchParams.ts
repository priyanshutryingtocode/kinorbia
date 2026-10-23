export function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export function parsePage(value: string | string[] | undefined) {
  const raw = firstValue(value)?.trim();
  if (!raw || !/^[1-9]\d*$/.test(raw)) {
    return 1;
  }
  const page = Number(raw);
  return Number.isSafeInteger(page) && page > 0 ? page : 1;
}

export function parseYear(value: string | string[] | undefined) {
  const raw = firstValue(value)?.trim();
  if (!raw || !/^\d{4}$/.test(raw)) {
    return undefined;
  }
  const year = Number(raw);
  return year >= 1900 && year <= 2200 ? year : undefined;
}


export const LIBRARY_SORTS = ["recent", "rating", "title", "year"] as const;
type LibrarySortParam = (typeof LIBRARY_SORTS)[number];

export type LibraryFacetParams = {
  genre?: number;
  minRating?: number;
  year?: number;
  sort?: LibrarySortParam;
};

export function parseLibraryFacets(params: {
  genre?: string | string[];
  minRating?: string | string[];
  year?: string | string[];
  sort?: string | string[];
}): LibraryFacetParams {
  const facets: LibraryFacetParams = {};

  const genre = Number(firstValue(params.genre)?.trim());
  if (firstValue(params.genre)?.trim() && Number.isInteger(genre) && genre >= 0) {
    facets.genre = genre;
  }

  const minRatingRaw = firstValue(params.minRating)?.trim();
  if (minRatingRaw) {
    const minRating = Number(minRatingRaw);
    if (Number.isFinite(minRating) && minRating >= 1 && minRating <= 10) {
      facets.minRating = minRating;
    }
  }

  const yearRaw = firstValue(params.year)?.trim();
  if (yearRaw) {
    const year = Number(yearRaw);
    if (Number.isInteger(year) && year >= 1870 && year <= 2100) {
      facets.year = year;
    }
  }

  const sort = firstValue(params.sort)?.trim();
  if (sort && (LIBRARY_SORTS as readonly string[]).includes(sort)) {
    facets.sort = sort as LibrarySortParam;
  }

  return facets;
}

export function libraryFacetQuery(facets: LibraryFacetParams) {
  const params = new URLSearchParams();
  if (facets.genre !== undefined) params.set("genre", String(facets.genre));
  if (facets.minRating !== undefined) params.set("minRating", String(facets.minRating));
  if (facets.year !== undefined) params.set("year", String(facets.year));
  if (facets.sort !== undefined && facets.sort !== "recent") params.set("sort", facets.sort);
  return params;
}

export function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
