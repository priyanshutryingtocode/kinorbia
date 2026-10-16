import Image from "next/image";
import type { WatchProvider } from "@/types";

// Services arrive already narrowed to one country -- the caller resolves it, so two
// countries can never be mixed in one row. No picker: an earlier uncontrolled <select>
// changed nothing until you pressed a button, leaving dropdown and content disagreeing.
//
// TMDB billing variants ("Paramount Plus Premium"/"Essential" are one service) are shown
// separately; merging by name risks naming a service a title is not on.

// Enough to cover the realistic shelf without turning the row into a wall of logos.
const PER_KIND_LIMIT = 6;

const KIND_LABELS: Record<WatchProvider["kind"], string> = {
  stream: "Streaming on",
  rent: "Rent from",
  buy: "Buy from",
};

type WatchProviderRowProps = {
  providers: WatchProvider[];
  /** False when TMDB could not be reached, which is different from "nothing here". */
  hasData: boolean;
};

export default function WatchProviderRow({ providers, hasData }: WatchProviderRowProps) {
  // Nothing to say when the lookup failed or the title has no offers anywhere. Showing a
  // heading over an empty list is worse than not showing the section at all.
  if (!hasData) return null;


  const grouped = (["stream", "rent", "buy"] as const)
    .map((kind) => ({
      kind,
      items: providers.filter((provider) => provider.kind === kind).slice(0, PER_KIND_LIMIT),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <section aria-labelledby="watch-providers-heading" className="mt-8">
      <h2
        id="watch-providers-heading"
        className="mb-3 text-xs font-bold uppercase tracking-widest text-highlight-muted"
      >
        Where to watch
      </h2>

      {grouped.length === 0 ? (
        // A real answer, not an error: TMDB lists no service in this country for this title.
        <p className="text-sm text-content-muted">
          No streaming services are listed.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          {grouped.map((group) => (
            <div key={group.kind} className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <span className="w-28 shrink-0 text-sm text-content-subtle">
                {KIND_LABELS[group.kind]}
              </span>
              <ul className="flex flex-wrap items-center gap-2">
                {group.items.map((provider) => (
                  <li
                    key={`${group.kind}-${provider.name}`}
                    className="flex items-center gap-2 rounded-full border border-panel-border bg-panel-surface px-3 py-1.5"
                  >
                    {provider.logoPath && (
                      <Image
                        src={`https://image.tmdb.org/t/p/w45${provider.logoPath}`}
                        alt=""
                        width={18}
                        height={18}
                        className="h-4.5 w-4.5 rounded-full"
                      />
                    )}
                    <span className="text-sm text-content">{provider.name}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
