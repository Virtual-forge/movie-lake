"use client";

import { DataError } from "@/components/data-error";

/**
 * Safety-net boundary for every segment without its own (and for errors
 * that skip past the route-level ones). The honest copy is generic; the
 * specific walls get their own boundaries next to their routes.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  // The digest is useful for server logs; keeping the message at all is
  // better than a blank wall — but it must not be technical jargon.
  console.error("[app error]", error.digest ?? error.message);

  return (
    <DataError
      heading="Something went wrong"
      hint="The page hit an unexpected error. Retry this page or head back to the Discover shelf."
      onRetry={reset}
    />
  );
}
