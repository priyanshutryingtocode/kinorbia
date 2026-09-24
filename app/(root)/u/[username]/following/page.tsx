import PeopleFollowPage from "@/components/PeopleFollowPage";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Following",
  description: "People this member follows.",
};

type Props = {
  params: Promise<{ username: string }>;
  searchParams: Promise<{
    q?: string | string[];
    page?: string | string[];
  }>;
};

export default async function FollowingPage({ params, searchParams }: Props) {
  const { username } = await params;
  return (
    <PeopleFollowPage
      username={username.toLowerCase()}
      mode="following"
      searchParams={searchParams}
    />
  );
}
