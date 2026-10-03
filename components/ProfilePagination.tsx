import NumberedPagination from "@/components/NumberedPagination";

type ProfilePaginationProps = {
  tab: string;
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
};

// The profile's four paginated tabs. The markup lives in `NumberedPagination`,
// shared with the public index pages; all this adds is the profile's URL shape.
//
// `tab` is always one of the four paginated tabs. The "overview" and "insights"
// branches this used to have were unreachable, because those tabs render no
// pager: the profile page handles them with earlier `if` branches. The `year`
// parameter went with them, and no call site passed it anyway.
export default function ProfilePagination({
  tab,
  page,
  totalPages,
  total,
  pageSize,
}: ProfilePaginationProps) {
  return (
    <NumberedPagination
      label={tab}
      page={page}
      totalPages={totalPages}
      total={total}
      pageSize={pageSize}
      buildHref={(target) => profileHref(tab, target)}
    />
  );
}

function profileHref(tab: string, page: number) {
  const params = new URLSearchParams({ tab });
  if (page > 1) {
    params.set("page", String(page));
  }
  return `/profile?${params.toString()}`;
}