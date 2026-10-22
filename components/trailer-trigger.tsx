"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

/**
 * Trailer trigger that opens an embedded player (privacy-friendly
 * youtube-nocookie, iframe mounted only while open) in a simple dialog.
 * The overlay is portaled to document.body so it faces no ancestor
 * stacking contexts (a sticky header would otherwise intercept clicks).
 * Progressive enhancement: without JavaScript the anchor still follows the
 * real YouTube watch URL; modifier-clicks keep native new-tab semantics.
 */
export function TrailerTrigger({
  trailerKey,
  trailerName,
  watchUrl,
  title,
  className,
  children,
}: {
  trailerKey: string;
  trailerName?: string;
  watchUrl: string;
  title: string;
  className?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);

  function openDialog(event: React.MouseEvent<HTMLAnchorElement>) {
    if (
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey ||
      event.button !== 0
    ) {
      return; // let the browser handle open-in-new-tab
    }
    event.preventDefault();
    setOpen(true);
  }

  return (
    <>
      <a href={watchUrl} onClick={openDialog} aria-haspopup="dialog" className={className}>
        {children}
      </a>

      {open &&
        createPortal(
          <div
            className="fixed inset-0 z-[60] grid place-items-center bg-black/85 p-4"
            role="presentation"
            onClick={(event) => {
              if (event.target === event.currentTarget) setOpen(false);
            }}
            onKeyDown={(event) => {
              if (event.key === "Escape") setOpen(false);
            }}
          >
            <div
              role="dialog"
              aria-modal="true"
              aria-label={`${title} — ${trailerName || "trailer"} player`}
              className="relative aspect-video w-full max-w-[960px]"
            >
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${trailerKey}?autoplay=1`}
                title={`${title} — ${trailerName || "trailer"}`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                // Plan (Security): older embeds are sandboxed beyond the
                // site-wide CSP frame-src; the grants keep playback and
                // fullscreen working while isolating the host page.
                sandbox="allow-scripts allow-same-origin allow-presentation allow-popups-to-escape-sandbox"
                allowFullScreen
                className="absolute inset-0 h-full w-full rounded-xl bg-black"
              />
              <button
                type="button"
                autoFocus
                onClick={() => setOpen(false)}
                aria-label="Close trailer player"
                className="absolute -top-11 right-0 grid size-9 place-items-center rounded-full border border-white/25 text-white transition-colors hover:bg-white/10"
              >
                <X aria-hidden className="size-4" />
              </button>
              <p className="mt-3 text-right text-[11px] text-white/60">
                <a
                  href={watchUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="underline underline-offset-2 hover:text-white"
                >
                  Watch on YouTube
                </a>
              </p>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}

/** Default pill styling for a trailer trigger (matches action buttons). */
export const TRIGGER_PILL_CLASS =
  "flex h-10 items-center gap-2 rounded-full border border-border px-4 text-[13px] font-medium text-content-secondary transition-colors hover:border-[#48443f] hover:text-content";
