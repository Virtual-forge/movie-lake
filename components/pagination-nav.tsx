import Link from "next/link";
import { ChevronLeft, ChevronRight, Ellipsis } from "lucide-react";

/**
 * Server pagination controls for URL-paged lists. Links are plain anchors so
 * every page is shareable and works without JavaScript. The current page is
 * a non-link pill (aria-current), neighbors keep a small numbered window.
 * Renders nothing for single-page results.
 */
export function PaginationNav({
  page,
  totalPages,
  hrefFor,
  label = "Pagination",
}: {
  page: number;
  totalPages: number;
  /** Builds the URL for a given page number (keeps other params outside). */
  hrefFor: (page: number) => string;
  label?: string;
}) {
  if (totalPages <= 1) return null;

  const numbers: Array<number | "…"> = [1];
  if (page - 1 > 2) numbers.push("…");
  for (const near of [page - 1, page, page + 1]) {
    if (near > 1 && near < totalPages) numbers.push(near);
  }
  if (totalPages - page > 2) numbers.push("…");
  if (totalPages > 1) numbers.push(totalPages);

  return (
    <nav
      aria-label={label}
      className="mt-8 flex flex-wrap items-center justify-center gap-1.5"
    >
      {page > 1 ? (
        <Link
          href={hrefFor(page - 1)}
          aria-label="Previous page"
          className="flex h-9 items-center gap-1 rounded-full border border-border bg-surface px-3.5 text-[13px] font-medium text-content transition-colors hover:border-[#48443f]"
        >
          <ChevronLeft aria-hidden className="size-4" />
          Prev
        </Link>
      ) : (
        <span
          aria-hidden
          className="flex h-9 items-center gap-1 rounded-full border border-border opacity-30 px-3.5 text-[13px] text-content"
        >
          <ChevronLeft className="size-4" />
          Prev
        </span>
      )}

      {numbers.map((entry, index) =>
        entry === "…" ? (
          <span
            key={`gap-${index}`}
            aria-hidden
            className="grid h-9 place-items-center px-1 text-content-muted"
          >
            <Ellipsis className="size-4" />
          </span>
        ) : entry === page ? (
          <span
            key={`page-${entry}`}
            aria-current="page"
            aria-label={`Page ${entry}, current page`}
            className="flex h-9 min-w-9 items-center justify-center rounded-full border border-transparent bg-content px-3 text-[13px] font-medium text-background"
          >
            {entry}
          </span>
        ) : (
          <Link
            key={`page-${entry}`}
            href={hrefFor(entry)}
            aria-label={`Page ${entry}`}
            className="flex h-9 min-w-9 items-center justify-center rounded-full border border-border bg-surface px-3 text-[13px] text-content transition-colors hover:border-[#48443f]"
          >
            {entry}
          </Link>
        ),
      )}

      {page < totalPages ? (
        <Link
          href={hrefFor(page + 1)}
          aria-label="Next page"
          className="flex h-9 items-center gap-1 rounded-full border border-border bg-surface px-3.5 text-[13px] font-medium text-content transition-colors hover:border-[#48443f]"
        >
          Next
          <ChevronRight aria-hidden className="size-4" />
        </Link>
      ) : (
        <span
          aria-hidden
          className="flex h-9 items-center gap-1 rounded-full border border-border opacity-30 px-3.5 text-[13px] text-content"
        >
          Next
          <ChevronRight className="size-4" />
        </span>
      )}
    </nav>
  );
}
