import PeopleFollowPage from "@/components/PeopleFollowPage";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Followers",
  description: "People following this member.",
};

type Props = {
  params: Promise<{ username: string }> | { username: string };
};

export default async function FollowersPage({ params }: Props) {
  const username = (await Promise.resolve(params)).username.toLowerCase();
  return <PeopleFollowPage username={username} mode="followers" />;
}
