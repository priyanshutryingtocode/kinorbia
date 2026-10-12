import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { firstValue, parsePage } from "@/lib/searchParams";
import PeopleList from "@/components/PeopleList";
import RouteShell from "@/components/RouteShell";
import { getFollowList } from "@/features/profile/queries";

const COPY = {
  followers: {
    heading: "Followers",
    emptyTitle: "No followers yet",
    emptyDescription: "This member hasn't been followed by anyone yet.",
  },
  following: {
    heading: "Following",
    emptyTitle: "Not following anyone yet",
    emptyDescription: "Follow members to see their reviews and lists in your Activity feed.",
  },
};

type PeopleSearchParams = {
  q?: string | string[];
  page?: string | string[];
};

export default async function PeopleFollowPage({
  username,
  mode,
  searchParams,
}: {
  username: string;
  mode: "followers" | "following";
  searchParams: Promise<PeopleSearchParams>;
}) {
  const copy = COPY[mode];
  const [{ q, page: pageParam }, session] = await Promise.all([
    searchParams,
    auth(),
  ]);
  const query = firstValue(q)?.trim() || "";
  const requestedPage = parsePage(pageParam);
  const currentEmail = session?.user?.email?.toLowerCase();

  const list = await getFollowList({ username, mode, query, requestedPage, currentEmail });

  if (!list) {
    notFound();
  }

  const { people, totalCount, page, totalPages } = list;
  const path = `/u/${encodeURIComponent(username)}/${mode}`;

  return (
    <RouteShell spacing="extended" width="standard">
      <Link
        href={`/u/${encodeURIComponent(username)}`}
        className="kin-focus group inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-content-muted transition-colors hover:text-highlight"
      >
        <span
          className="transition-transform group-hover:-translate-x-0.5"
          aria-hidden="true"
        >
          ←
        </span>
        Back to profile
      </Link>
      <header className="mb-6 mt-5 border-b border-rule pb-5">
        <p className="kin-overline text-highlight-muted">@{username}</p>
        <h1 className="mt-2 font-display text-3xl font-medium leading-none text-content sm:text-4xl">
          {copy.heading}
        </h1>
      </header>
      <PeopleList
        people={people}
        isAuthenticated={Boolean(currentEmail)}
        path={path}
        query={query}
        page={page}
        totalCount={totalCount}
        totalPages={totalPages}
        emptyTitle={copy.emptyTitle}
        emptyDescription={copy.emptyDescription}
      />
    </RouteShell>
  );
}
