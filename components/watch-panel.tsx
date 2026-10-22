import Image from "next/image";
import Link from "next/link";

import type { WatchRegionView } from "@/lib/normalize";

const SLICE_LABELS = {
  flatrate: "Stream",
  rent: "Rent",
  buy: "Buy",
} as const;

/**
 * "Where to watch" panel — US offer set from JustWatch (via TMDB's
 * watch/providers append). Honest states: the section only renders when a
 * US entry exists; slices render only when they have providers. TMDB
 * terms require the JustWatch credit alongside this data.
 */
export function WatchPanel({ watch }: { watch: WatchRegionView | null | undefined }) {
  if (!watch || !watch.hasAny) return null;

  return (
    <section aria-label="Where to watch" className="rounded-2xl border border-border bg-surface p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-[15px] font-semibold text-content">
          Where to watch
          <span className="ml-2 text-[11px] font-normal text-content-muted"> (US)</span>
        </h2>
        {watch.link && (
          <Link
            href={watch.link}
            target="_blank"
            rel="noreferrer"
            className="text-[12px] text-content-secondary underline decoration-border underline-offset-2 transition-colors hover:text-content"
          >
            See all offers on TMDB
          </Link>
        )}
      </div>

      <div className="mt-4 flex flex-col gap-3.5">
        {(Object.keys(SLICE_LABELS) as Array<keyof typeof SLICE_LABELS>).map((slice) => {
          const providers = watch.slices[slice];
          if (!providers || providers.length === 0) return null;
          return (
            <div key={slice} className="flex flex-wrap items-center gap-2.5">
              <span className="w-14 shrink-0 text-[11px] uppercase tracking-[0.14em] text-content-muted">
                {SLICE_LABELS[slice]}
              </span>
              <ul className="flex flex-wrap gap-1.5">
                {providers.map((provider) => (
                  <li
                    key={`${slice}-${provider.name}`}
                    title={provider.name}
                    className="flex items-center gap-1.5 rounded-lg border border-border bg-surface-elevated px-2 py-1"
                  >
                    {provider.logoUrl && (
                      <Image
                        src={provider.logoUrl}
                        alt={`${provider.name} logo`}
                        width={22}
                        height={22}
                        className="rounded"
                      />
                    )}
                    <span className="text-[12px] text-content-secondary">{provider.name}</span>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>

      <p className="mt-4 text-[11px] text-content-muted">
        Availability changes often and is not part of this site{"'"}s own data —
        verified here:{" "}
        <a
          href="https://www.justwatch.com/"
          target="_blank"
          rel="noreferrer"
          className="underline decoration-border underline-offset-2 transition-colors hover:text-content-secondary"
        >
          JustWatch
        </a>
        .
      </p>
    </section>
  );
}
