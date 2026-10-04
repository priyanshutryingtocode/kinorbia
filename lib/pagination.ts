export function pageBounds(total: number, requestedPage: number, pageSize: number) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  return {
    page: Math.min(Math.max(1, requestedPage), totalPages),
    totalPages,
  };
}

type SortSpec = Record<string, 1 | -1>;

type PageableQuery<TRaw> = {
  sort(sort: SortSpec): PageableQuery<TRaw>;
  select(fields: string): PageableQuery<TRaw>;
  skip(skip: number): PageableQuery<TRaw>;
  limit(limit: number): PageableQuery<TRaw>;
  lean(): Promise<TRaw[]>;
};

type PageableModel<TRaw> = {
  countDocuments(filter: Record<string, unknown>): Promise<number>;
  find(filter: Record<string, unknown>): PageableQuery<TRaw>;
};

export async function paginate<TRaw>(
  model: PageableModel<TRaw>,
  filter: Record<string, unknown>,
  sort: SortSpec,
  requestedPage: number,
  pageSize: number,
  projection?: string
): Promise<{ rows: TRaw[]; page: number; totalPages: number; total: number }> {
  const fetchPage = (page: number) => {
    const query = model.find(filter);
    return (projection ? query.select(projection) : query)
      .sort(sort)
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .lean();
  };

  const [total, initialRows] = await Promise.all([
    model.countDocuments(filter),
    fetchPage(Math.max(1, requestedPage)),
  ]);

  const bounds = pageBounds(total, requestedPage, pageSize);
  const rows = bounds.page === requestedPage ? initialRows : await fetchPage(bounds.page);

  return { rows, total, ...bounds };
}

export const INDEX_PAGE_SIZES = {
  reviews: 12,
  lists: 12,
  activity: 15,
} as const;
