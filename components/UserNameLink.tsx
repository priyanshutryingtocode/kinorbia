import Link from "next/link";
import { profileHref } from "@/lib/profileLinks";

type UserNameLinkProps = {
  userName: string;
  // The author's username slug, or undefined when it could not be resolved.
  username?: string;
};

// A byline that links to the author's public profile when their username is
// known, and degrades to plain text when it is not.
//
// The fallback is the important half: a deleted account, or one that predates
// `ensureUserIdentity`, has no slug, and a link built from the display name
// would point at `/u/Priya Sharma` and render `notFound()`. Plain text is the
// honest rendering for an author we cannot link to.
// Inherits the byline's own typography from the surrounding text, so it looks
// like the words it replaces. That is why there is no className prop and no
// colour of its own: the call sites are all inside a container that already
// sets the muted content colour.
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
