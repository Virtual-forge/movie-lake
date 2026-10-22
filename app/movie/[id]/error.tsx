"use client";

import { DataError } from "@/components/data-error";

/** Films detail (+ its /watch child segment) boundary for TMDB/system failures. */
export default function MovieError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  console.error("[movie error]", error.digest ?? error.message);

  return (
    <DataError
      heading="This film can't load right now"
      hint="Film data from the source didn't arrive — retry or come back shortly."
      onRetry={reset}
    />
  );
}
