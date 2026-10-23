import NumberedPagination from "@/components/NumberedPagination";
import { libraryFacetQuery, type LibraryFacetParams } from "@/lib/searchParams";

type ProfilePaginationProps = {
  tab: string;
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  facets?: LibraryFacetParams;
};

export default function ProfilePagination({
  tab,
  page,
  totalPages,
  total,
  pageSize,
  facets,
}: ProfilePaginationProps) {
  return (
    <NumberedPagination
      label={tab}
      page={page}
      totalPages={totalPages}
      total={total}
      pageSize={pageSize}
      buildHref={(target) => profileHref(tab, target, facets)}
    />
  );
}

function profileHref(tab: string, page: number, facets?: LibraryFacetParams) {
  const params = new URLSearchParams({ tab });
  if (page > 1) {
    params.set("page", String(page));
  }
  for (const [key, value] of libraryFacetQuery(facets ?? {})) {
    params.set(key, value);
  }
  return `/profile?${params.toString()}`;
}