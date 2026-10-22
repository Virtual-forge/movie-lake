/** Shared poster-grid skeleton for search and genre shells. */
export function PosterGridSkeleton({ count = 7 }: { count?: number }) {
  return (
    <ul className="grid grid-cols-2 gap-x-4 gap-y-7 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7" aria-hidden>
      {Array.from({ length: count }).map((_, i) => (
        <li key={i}>
          <div className="aspect-[2/3] w-full animate-pulse rounded-xl bg-surface" />
          <div className="mt-3 h-3 w-2/3 rounded bg-surface" />
        </li>
      ))}
    </ul>
  );
}
