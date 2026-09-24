import Image from "next/image";
import Link from "next/link";
import { User as UserIcon } from "lucide-react";
import FollowButton from "./FollowButton";

export type Person = {
  id: string;
  name: string;
  username?: string;
  image?: string;
  isFollowing: boolean;
  isSelf: boolean;
};

type PersonCardProps = {
  person: Person;
  isAuthenticated: boolean;
  path: string;
};

export default function PersonCard({ person, isAuthenticated, path }: PersonCardProps) {
  const href = person.isSelf
    ? "/profile"
    : person.username
      ? `/u/${encodeURIComponent(person.username)}`
      : null;
  const avatar = (
    <span className="relative block h-10 w-10 shrink-0 overflow-hidden rounded-full border border-white/10 bg-neutral-900">
      {person.image ? (
        <Image src={person.image} alt="" fill sizes="40px" className="object-cover" />
      ) : (
        <span
          className="flex h-full w-full items-center justify-center text-neutral-400"
          aria-hidden="true"
        >
          <UserIcon className="h-5 w-5" />
        </span>
      )}
    </span>
  );
  const identity = (
    <>
      {avatar}
      <span className="min-w-0 flex-1">
        <span className="block truncate rounded-sm font-display text-base font-medium leading-tight text-white transition-colors group-hover:text-gold">
          {person.name}
        </span>
        <span className="mt-0.5 block truncate text-xs text-neutral-400">
          {person.isSelf
            ? "You"
            : person.username
              ? `@${person.username}`
              : "Member"}
        </span>
      </span>
    </>
  );

  return (
    <article className="group flex min-w-0 items-center gap-3 py-3">
      {href ? (
        <Link
          href={href}
          className="kin-focus flex min-w-0 flex-1 items-center gap-3 rounded-sm text-left"
          aria-label={person.isSelf ? "View your profile" : `View ${person.name}'s profile`}
        >
          {identity}
        </Link>
      ) : (
        <div className="flex min-w-0 flex-1 items-center gap-3">{identity}</div>
      )}
      {isAuthenticated && !person.isSelf && (
        <div className="ml-auto flex shrink-0 items-center justify-end">
          <FollowButton
            targetUserId={person.id}
            targetName={person.name}
            isFollowing={person.isFollowing}
            path={path}
          />
        </div>
      )}
    </article>
  );
}
