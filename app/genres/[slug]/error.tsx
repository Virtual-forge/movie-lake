"use client";

import { DataError } from "@/components/data-error";

/** Genre shelf boundary for TMDB/system failures (all kind params share it). */
export default function GenreError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  console.error("[genre error]", error.digest ?? error.message);

  return (
    <DataError
      heading="That genre shelf can't load right now"
      hint="The shelf data didn't arrive — retry or pick another genre for now."
      onRetry={reset}
    />
  );
}
