"use client";

import { DataError } from "@/components/data-error";

/** Covers both /search and /search/advanced for server-side failures. */
export default function SearchError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  console.error("[search error]", error.digest ?? error.message);

  return (
    <DataError
      heading="Search can't load right now"
      hint="The source didn't respond — retry the search or come back shortly."
      onRetry={reset}
    />
  );
}
