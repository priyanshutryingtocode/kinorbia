import Link from "next/link";
import { profileHref } from "@/lib/profileLinks";

type UserNameLinkProps = {
  userName: string;
  username?: string;
};

export default function UserNameLink({ userName, username }: UserNameLinkProps) {
  if (!username) {
    return <span>{userName}</span>;
  }

  return (
    <Link
      href={profileHref(username)}
      className="kin-focus rounded-sm transition-colors hover:text-highlight"
    >
      {userName}
    </Link>
  );
}
