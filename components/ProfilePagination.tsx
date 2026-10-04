import NumberedPagination from "@/components/NumberedPagination";

type ProfilePaginationProps = {
  tab: string;
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
};

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