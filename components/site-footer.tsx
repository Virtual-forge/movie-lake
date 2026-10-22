import Link from "next/link";

const FOOTER_LINKS = [
  { href: "/", label: "Discover" },
  { href: "/search?kind=movie", label: "Movies" },
  { href: "/search?kind=tv", label: "Series" },
] as const;

export function SiteFooter() {
  return (
    <footer className="mt-16 border-t border-border">
      <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-6 px-5 py-10 md:flex-row md:items-center md:justify-between md:px-10 lg:px-14">
        <div className="text-[10px] font-semibold leading-[1.35] tracking-[0.38em] text-content-secondary">
          <span className="block">MOVIE</span>
          <span className="block">LAKE</span>
        </div>

        <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-2">
          {FOOTER_LINKS.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="text-[13px] text-content-muted transition-colors hover:text-content"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="max-w-sm text-xs leading-relaxed text-content-muted">
          <p>
            © 2026 Movie Lake — a design study demo, not a streaming service.
            Curated public-domain and openly licensed films stream via the
            Internet Archive on movie watch pages; everything else gets
            trailers and retail options.
          </p>
          <p className="mt-2">
            Metadata, ratings and artwork from{" "}
            <a
              href="https://www.themoviedb.org/"
              target="_blank"
              rel="noreferrer"
              className="underline-offset-4 transition-colors hover:text-content hover:underline"
            >
              TMDB
            </a>
            . Watch provider data from{" "}
            <a
              href="https://www.justwatch.com/"
              target="_blank"
              rel="noreferrer"
              className="underline-offset-4 transition-colors hover:text-content hover:underline"
            >
              JustWatch
            </a>
            . Full-film streaming courtesy of the{" "}
            <a
              href="https://archive.org/"
              target="_blank"
              rel="noreferrer"
              className="underline-offset-4 transition-colors hover:text-content hover:underline"
            >
              Internet Archive
            </a>
            .
          </p>
          <p className="mt-2 text-[11px]">
            This product uses the TMDB API but is not endorsed or certified by
            TMDB.
          </p>
        </div>
      </div>
    </footer>
  );
}
