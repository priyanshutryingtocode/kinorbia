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
    <span className="relative block h-14 w-14 shrink-0 overflow-hidden rounded-full border border-white/10 bg-neutral-900 shadow-card">
      {person.image ? (
        <Image src={person.image} alt="" fill sizes="56px" className="object-cover" />
      ) : (
        <span className="flex h-full w-full items-center justify-center text-neutral-500" aria-hidden="true">
          <UserIcon className="h-7 w-7" />
        </span>
      )}
    </span>
  );
  const identity = (
    <>
      {avatar}
      <div className="min-w-0 flex-1">
        <span className="kin-focus block truncate rounded-sm font-display text-lg font-semibold text-white transition group-hover:text-gold">
          {person.name}
        </span>
        <span className="mt-1 block truncate text-sm text-neutral-500">
          {person.isSelf ? "You" : person.username ? `@${person.username}` : "Member"}
        </span>
      </div>
    </>
  );

  return (
    <article className="premium-card group flex h-full flex-col rounded-card p-5 hover:-translate-y-0.5 hover:border-gold/30">
      {href ? (
        <Link href={href} className="flex min-w-0 items-center gap-4 rounded-lg" aria-label={`View ${person.name}'s profile`}>
          {identity}
        </Link>
      ) : (
        <div className="flex min-w-0 items-center gap-4">{identity}</div>
      )}
      {isAuthenticated && !person.isSelf && (
        <div className="mt-5 flex justify-end">
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
