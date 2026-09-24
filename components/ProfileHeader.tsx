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
    <section className="premium-surface film-grain relative overflow-hidden rounded-panel p-6 sm:p-8">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_0%,rgba(212,165,116,0.16),transparent_38%),radial-gradient(circle_at_90%_10%,rgba(220,38,38,0.12),transparent_34%)]" />
      <div className="relative flex flex-col gap-7 lg:flex-row lg:items-end">
        <div className="flex min-w-0 flex-1 flex-col gap-5 sm:flex-row sm:items-end">
          <div className="h-28 w-28 shrink-0 overflow-hidden rounded-full border-2 border-gold/40 bg-neutral-900 shadow-card sm:h-32 sm:w-32">
            {image ? (
              <Image
                src={image}
                alt={`${name}'s profile`}
                width={128}
                height={128}
                priority
                className="h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-neutral-600">
                <UserIcon className="h-12 w-12" aria-hidden="true" />
              </div>
            )}
          </div>
          <div className="min-w-0 flex-1 text-center sm:text-left">
            {username && (
              <p className="mb-2 text-xs font-bold uppercase tracking-[0.18em] text-gold">
                @{username}
              </p>
            )}
            <h1 className="break-words font-display text-4xl font-bold leading-[0.95] text-white md:text-5xl">
              {name}
            </h1>
            {bio ? (
              <p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-neutral-300 sm:mx-0">
                {bio}
              </p>
            ) : (
              <p className="mt-4 text-sm italic text-neutral-500">No bio yet.</p>
            )}
            <div className="mt-5 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-neutral-500 sm:justify-start">
              {joinedYear && (
                <span className="inline-flex items-center gap-1.5 uppercase tracking-widest">
                  <Calendar className="h-3.5 w-3.5" aria-hidden="true" />
                  Joined {joinedYear}
                </span>
              )}
              {profilePath && (
                <>
                  <Link
                    href={`${profilePath}/followers`}
                    className="kin-focus rounded-sm transition hover:text-gold"
                  >
                    {followers} {followers === 1 ? "follower" : "followers"}
                  </Link>
                  <Link
                    href={`${profilePath}/following`}
                    className="kin-focus rounded-sm transition hover:text-gold"
                  >
                    {following} {following === 1 ? "following" : "following"}
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
        {children && <div className="flex flex-wrap items-center gap-3 lg:justify-end">{children}</div>}
      </div>
    </section>
  );
}
