import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { pageBounds } from "@/lib/pagination";
import dbConnect from "@/lib/dbConnect";
import { escapeRegExp, firstValue, parsePage } from "@/lib/searchParams";
import User from "@/models/User";
import PeopleList from "@/components/PeopleList";
import RouteShell from "@/components/RouteShell";
import { PEOPLE_PAGE_SIZE } from "@/lib/profileData";

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

type PersonRecord = {
  _id: { toString: () => string };
  email: string;
  name: string;
  username?: string | null;
  image?: string | null;
};

type ProfileUser = {
  email: string;
  following?: string[] | null;
};

type ViewerUser = {
  following?: string[] | null;
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

  await dbConnect();
  const user = await User.findOne({ username })
    .select("_id email following")
    .lean<ProfileUser | null>();

  if (!user) {
    notFound();
  }

  const profileEmail = user.email.toLowerCase();
  const followedEmails = (user.following || []).map((email) => email.toLowerCase());
  const searchPattern = query ? new RegExp(escapeRegExp(query), "i") : null;
  const peopleFilter =
    mode === "followers"
      ? searchPattern
        ? {
            following: profileEmail,
            $or: [{ name: searchPattern }, { username: searchPattern }],
          }
        : { following: profileEmail }
      : searchPattern
        ? {
            email: { $in: followedEmails },
            $or: [{ name: searchPattern }, { username: searchPattern }],
          }
        : { email: { $in: followedEmails } };

  const [totalCount, currentUser] = await Promise.all([
    User.countDocuments(peopleFilter),
    currentEmail
      ? User.findOne({ email: currentEmail })
          .select("following")
          .lean<ViewerUser | null>()
      : Promise.resolve(null),
  ]);
  const { page, totalPages } = pageBounds(totalCount, requestedPage, PEOPLE_PAGE_SIZE);
  const records = totalCount
    ? await User.find(peopleFilter)
        .select("_id email name username image")
        .sort({ name: 1, username: 1, _id: 1 })
        .skip((page - 1) * PEOPLE_PAGE_SIZE)
        .limit(PEOPLE_PAGE_SIZE)
        .lean<PersonRecord[]>()
    : [];
  const following = new Set(
    (currentUser?.following || []).map((email) => email.toLowerCase())
  );
  const people = records.map((person) => {
    const email = person.email.toLowerCase();
    return {
      id: person._id.toString(),
      name: person.name,
      username: person.username || undefined,
      image: person.image || undefined,
      isFollowing: following.has(email),
      isSelf: email === currentEmail,
    };
  });
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
