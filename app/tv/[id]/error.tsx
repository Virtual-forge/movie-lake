"use client";

import { DataError } from "@/components/data-error";

/** Series detail boundary for TMDB/system failures. */
export default function TvError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  console.error("[tv error]", error.digest ?? error.message);

  return (
    <DataError
      heading="This series can't load right now"
      hint="Series data from the source didn't arrive — retry or come back shortly."
      onRetry={reset}
    />
  );
}
