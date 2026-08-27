import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-6 py-20 text-center">
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-gold">Reel not found</p>
      <h1 className="font-display mt-3 text-4xl font-bold text-white md:text-5xl">
        This reel is <span className="italic font-normal text-neutral-300">missing</span>
      </h1>
      <p className="mt-4 max-w-md text-sm leading-6 text-neutral-400">
        The title you&apos;re looking for isn&apos;t in our archive yet. Try searching or browse what&apos;s popular.
      </p>
      <div className="mt-8 flex flex-wrap justify-center gap-3">
        <Link href="/search" className="rounded-full bg-brand px-6 py-3 text-sm font-semibold text-white transition hover:bg-brand-hover">
          Search films
        </Link>
        <Link href="/" className="rounded-full border border-white/10 bg-white/5 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10">
          Browse Popular
        </Link>
      </div>
      <div className="mt-10 h-px w-12 bg-gold/30" />
    </div>
  );
}
