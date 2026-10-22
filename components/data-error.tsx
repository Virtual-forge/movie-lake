"use client";

import Link from "next/link";
import { TriangleAlert } from "lucide-react";

/**
 * Shared segment error UI (Phase 5). Each route's error.tsx renders this —
 * same quiet visual language as the rest of the site (`TRIGGER_PILL_CLASS`
 * cards + pill buttons), honest wording about what failed, a retry for the
 * transient cases, and a way home.
 */
export function DataError({
  heading,
  hint,
  retryLabel = "Try again",
  onRetry,
}: {
  heading: string;
  /**
   * Contextual sentence from the calling boundary. The fallback text stays
   * generic-honest; callers should say which wall broke, not invent tools.
   */
  hint?: string;
  onRetry?: () => void;
  retryLabel?: string;
}) {
  return (
    <div className="mx-auto flex w-full max-w-[720px] flex-col items-center gap-5 px-6 py-28 text-center">
      <TriangleAlert aria-hidden className="size-10 text-content-muted" />
      <h1 className="text-[clamp(1.3rem,2.2vw,1.8rem)] font-semibold tracking-tight text-content">
        {heading}
      </h1>
      <p className="text-[14px] leading-relaxed text-content-muted">
        {hint ??
          "The data source didn't respond — this is usually temporary."}
      </p>
      <div className="mt-2 flex flex-wrap items-center justify-center gap-3">
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="flex h-10 items-center rounded-full border border-border px-4 text-[13px] font-medium text-content transition-colors hover:border-[#48443f] hover:bg-border disabled:cursor-progress disabled:opacity-70"
          >
            {retryLabel}
          </button>
        )}
        <Link
          href="/"
          className="flex h-10 items-center rounded-full border border-border px-4 text-[13px] font-medium text-content-secondary transition-colors hover:border-[#48443f] hover:text-content"
        >
          Back to Discover
        </Link>
      </div>
    </div>
  );
}
