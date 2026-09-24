import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import PeopleList from "@/components/PeopleList";

const PEOPLE_PER_PAGE = 24;

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

export type PeopleSearchParams = {
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

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function parsePage(value: string | string[] | undefined) {
  const rawPage = firstValue(value)?.trim();
  if (!rawPage || !/^[1-9]\d*$/.test(rawPage)) {
    return 1;
  }

  const page = Number(rawPage);
  return Number.isSafeInteger(page) && page > 0 ? page : 1;
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

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
  const totalPages = Math.max(1, Math.ceil(totalCount / PEOPLE_PER_PAGE));
  const page = Math.min(requestedPage, totalPages);
  const records = totalCount
    ? await User.find(peopleFilter)
        .select("_id email name username image")
        .sort({ name: 1, username: 1, _id: 1 })
        .skip((page - 1) * PEOPLE_PER_PAGE)
        .limit(PEOPLE_PER_PAGE)
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
  const resultSummary = query
    ? `${totalCount} ${totalCount === 1 ? "match" : "matches"} for “${query}”`
    : `${totalCount} ${totalCount === 1 ? "person" : "people"}`;

  return (
    <div className="min-h-screen px-4 pb-20 pt-24 text-white sm:px-6">
      <div className="mx-auto max-w-6xl">
        <Link
          href={`/u/${encodeURIComponent(username)}`}
          className="kin-focus inline-flex rounded-full text-sm font-medium text-neutral-400 transition hover:text-red-400"
        >
          Back to profile
        </Link>
        <header className="mb-8 mt-6">
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-gold">
            @{username}
          </p>
          <h1 className="font-display text-4xl font-bold leading-none md:text-5xl">
            {copy.heading}
          </h1>
          <p className="mt-3 text-neutral-400">{resultSummary}</p>
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
      </div>
    </div>
  );
}
