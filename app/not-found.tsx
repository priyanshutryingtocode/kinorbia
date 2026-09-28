import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 py-20 text-center">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold">Reel not found</p>
      <h1 className="font-display mt-3 text-4xl font-medium text-content md:text-5xl">
        This reel is <span className="italic font-normal text-content">missing</span>
      </h1>
      <p className="mt-4 max-w-md text-sm leading-6 text-content-muted">
        The title you&apos;re looking for isn&apos;t in our archive yet. Try searching or browse what&apos;s popular.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/search" className="rounded-full bg-brand px-6 py-3 text-sm font-semibold text-content transition hover:bg-brand-hover">
          Search films
        </Link>
        <Link href="/" className="rounded-full border border-rule bg-surface px-6 py-3 text-sm font-semibold text-content transition hover:bg-surface-raised">
          Browse Popular
        </Link>
      </div>
    </div>
  );
}
