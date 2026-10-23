import ProviderLogo from "@/components/ProviderLogo";
import { tmdbImage } from "@/lib/media";
import type { WatchProvider } from "@/types";

const PER_KIND_LIMIT = 6;

const KIND_LABELS: Record<WatchProvider["kind"], string> = {
  stream: "Streaming on",
  rent: "Rent from",
  buy: "Buy from",
};

type WatchProviderRowProps = {
  providers: WatchProvider[];
  hasData: boolean;
};

export default function WatchProviderRow({ providers, hasData }: WatchProviderRowProps) {
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
                    <ProviderLogo src={tmdbImage(provider.logoPath, "w45")} className="h-4.5 w-4.5 rounded-full" />
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
