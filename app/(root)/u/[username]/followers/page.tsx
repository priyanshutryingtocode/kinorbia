import Link from "next/link";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import PeopleList from "@/components/PeopleList";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Followers",
  description: "People following this member.",
};

type Props = {
  params: Promise<{ username: string }> | { username: string };
};

export default async function FollowersPage({ params }: Props) {
  const { username } = await Promise.resolve(params);
  const session = await auth();
  const currentEmail = session?.user?.email?.toLowerCase();

  await dbConnect();
  const user = await User.findOne({ username })
    .select("email")
    .lean<{ email: string } | null>();

  if (!user) {
    notFound();
  }

  const [people, currentUser] = await Promise.all([
    User.find({ following: user.email })
      .select("email name username image")
      .sort({ name: 1 })
      .lean<{ email: string; name: string; username?: string; image?: string }[]>(),
    currentEmail
      ? User.findOne({ email: currentEmail })
          .select("following")
          .lean<{ following: string[] } | null>()
      : Promise.resolve(null),
  ]);

  const following = currentUser?.following || [];

  return (
    <div className="min-h-screen px-6 py-12 text-white">
      <div className="mx-auto max-w-2xl">
        <Link href={`/u/${username}`} className="text-sm text-neutral-400 hover:text-red-400 transition">
          Back to profile
        </Link>
        <header className="mb-8 mt-6">
          <p className="mb-2 text-sm font-bold uppercase tracking-widest text-red-400">@ {username}</p>
          <h1 className="text-3xl font-bold md:text-4xl">Followers</h1>
          <p className="mt-2 text-neutral-400">{people.length} people</p>
        </header>
        <PeopleList
          people={people}
          currentUserEmail={currentEmail}
          following={following}
          path={`/u/${username}/followers`}
          emptyTitle="No followers yet"
          emptyDescription="This member hasn't been followed by anyone yet."
        />
      </div>
    </div>
  );
}