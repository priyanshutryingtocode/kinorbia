import Image from "next/image";
import Link from "next/link";
import { Calendar, User as UserIcon } from "lucide-react";
import type { ReactNode } from "react";

type ProfileHeaderProps = {
  name: string;
  username?: string | null;
  bio?: string | null;
  image?: string | null;
  createdAt?: Date | string | null;
  followers: number;
  following: number;
  children?: ReactNode;
};

export default function ProfileHeader({
  name,
  username,
  bio,
  image,
  createdAt,
  followers,
  following,
  children,
}: ProfileHeaderProps) {
  const profilePath = username ? `/u/${encodeURIComponent(username)}` : null;
  const joinedYear = createdAt ? new Date(createdAt).getUTCFullYear() : null;

  return (
    <section className="profile-masthead film-grain p-5 sm:p-6">
      <div className="profile-wash pointer-events-none absolute inset-0" aria-hidden="true" />
      <div className="relative flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex min-w-0 flex-1 items-start gap-4 sm:gap-5">
          <div className="h-20 w-20 shrink-0 overflow-hidden rounded-full border border-white/15 bg-neutral-900 ring-1 ring-gold/15 sm:h-24 sm:w-24">
            {image ? (
              <Image
                src={image}
                alt={`${name}'s profile`}
                width={96}
                height={96}
                loading="eager"
                fetchPriority="high"
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-neutral-600">
                <UserIcon className="h-8 w-8 sm:h-9 sm:w-9" aria-hidden="true" />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1 text-left">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <h1 className="break-words font-display text-3xl font-medium leading-tight text-white sm:text-4xl">
                {name}
              </h1>
              {username && <p className="kin-overline break-all text-gold/80">@{username}</p>}
            </div>
            {bio ? (
              <p className="mt-2.5 max-w-2xl text-sm leading-6 text-neutral-400">{bio}</p>
            ) : (
              <p className="mt-2.5 text-sm italic text-neutral-400">No bio yet.</p>
            )}
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-neutral-400">
              {joinedYear && (
                <span className="inline-flex items-center gap-1.5 font-medium uppercase tracking-[0.12em]">
                  <Calendar className="h-3 w-3" aria-hidden="true" />
                  Joined {joinedYear}
                </span>
              )}
              {profilePath && (
                <>
                  <Link
                    href={`${profilePath}/followers`}
                    className="kin-focus rounded-sm underline-offset-4 transition hover:text-gold hover:underline"
                  >
                    {followers} {followers === 1 ? "follower" : "followers"}
                  </Link>
                  <Link
                    href={`${profilePath}/following`}
                    className="kin-focus rounded-sm underline-offset-4 transition hover:text-gold hover:underline"
                  >
                    {following} following
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
        {children && (
          <div className="flex flex-wrap items-center gap-2 pl-24 sm:pl-[7.25rem] lg:shrink-0 lg:self-end lg:pl-0">
            {children}
          </div>
        )}
      </div>
    </section>
  );
}
