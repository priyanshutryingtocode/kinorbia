import PeopleFollowPage from "@/components/PeopleFollowPage";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Followers",
  description: "People following this member.",
};

type Props = {
  params: Promise<{ username: string }>;
  searchParams: Promise<{
    q?: string | string[];
    page?: string | string[];
  }>;
};

export default async function FollowersPage({ params, searchParams }: Props) {
  const { username } = await params;
  return (
    <PeopleFollowPage
      username={username.toLowerCase()}
      mode="followers"
      searchParams={searchParams}
    />
  );
}
