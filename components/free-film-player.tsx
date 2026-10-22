import type { ArchiveItemView } from "@/lib/api/internet-archive";

/**
 * Full-film player for curated free titles (docs/PROJECT_PLAN.md →
 * "FreeFilmPlayer"): the official Internet Archive embed at
 * archive.org/embed/{identifier}. Server-rendered plain HTML iframe —
 * the player itself lives on archive.org and needs their scripts, so
 * <noscript> carries the direct file / item-page fallbacks. The frame is
 * sandboxed beyond the site-wide CSP frame-src (plan: iframes use
 * sandbox/allow attributes; no third-party streaming embeds).
 */
export function FreeFilmPlayer({ archive, title }: { archive: ArchiveItemView; title: string }) {
  return (
    <div className="flex flex-col gap-3">
      <iframe
        src={`https://archive.org/embed/${encodeURIComponent(archive.identifier)}`}
        title={`Watch ${title} — full film`}
        sandbox="allow-scripts allow-same-origin allow-presentation allow-popups-to-escape-sandbox"
        allow="fullscreen; clipboard-write"
        allowFullScreen
        className="aspect-video w-full border border-border bg-black"
      />
      <noscript>
        <p className="text-[13px] text-content-secondary">
          JavaScript is off, so the embedded player can&apos;t run. You can still
          watch the film directly:{" "}
          {archive.directFile && (
            <>
              <a
                href={`https://archive.org/download/${encodeURIComponent(archive.identifier)}/${encodeURI(archive.directFile)}`}
                target="_blank"
                rel="noreferrer"
                className="underline underline-offset-4"
              >
                stream the video file
              </a>{" "}
              or{" "}
            </>
          )}
          <a
            href={`https://archive.org/details/${encodeURIComponent(archive.identifier)}`}
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-4"
          >
            open the item page on archive.org
          </a>
          .
        </p>
      </noscript>
    </div>
  );
}
