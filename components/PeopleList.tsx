import Link from "next/link";
import Image from "next/image";
import { User as UserIcon } from "lucide-react";
import FollowButton from "./FollowButton";
import EmptyState from "./EmptyState";

type Person = {
  email: string;
  name: string;
  username?: string;
  image?: string;
};

type PeopleListProps = {
  people: Person[];
  currentUserEmail?: string;
  following: string[];
  path: string;
  emptyTitle: string;
  emptyDescription: string;
};

export default function PeopleList({
  people,
  currentUserEmail,
  following,
  path,
  emptyTitle,
  emptyDescription,
}: PeopleListProps) {
  if (people.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div className="space-y-3">
      {people.map((person) => {
        const isSelf = person.email === currentUserEmail;
        const href = isSelf ? "/profile" : `/u/${person.username}`;
        const isFollowing = following.includes(person.email);

        return (
          <div
            key={person.email}
            className="flex items-center gap-4 rounded-lg border border-white/10 bg-neutral-900/50 p-4"
          >
            <Link href={href} className="relative h-12 w-12 shrink-0 overflow-hidden rounded-full bg-neutral-800">
              {person.image ? (
                <Image src={person.image} alt={person.name} fill sizes="48px" className="object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-neutral-500">
                  <UserIcon className="h-6 w-6" />
                </div>
              )}
            </Link>
            <div className="min-w-0 flex-1">
              <Link href={href} className="block truncate font-bold text-white hover:text-red-400 transition">
                {person.name}
              </Link>
              <p className="truncate text-xs text-neutral-500">
                {isSelf ? "You" : person.username ? `@${person.username}` : person.email}
              </p>
            </div>
            {!isSelf && currentUserEmail && (
              <FollowButton targetEmail={person.email} isFollowing={isFollowing} path={path} />
            )}
          </div>
        );
      })}
    </div>
  );
}