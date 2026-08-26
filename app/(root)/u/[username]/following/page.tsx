import PeopleFollowPage from "@/components/PeopleFollowPage";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Following",
  description: "People this member follows.",
};

type Props = {
  params: Promise<{ username: string }> | { username: string };
};

export default async function FollowingPage({ params }: Props) {
  const username = (await Promise.resolve(params)).username.toLowerCase();
  return <PeopleFollowPage username={username} mode="following" />;
}
