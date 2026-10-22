import { ExternalLink as ExternalLinkIcon } from "lucide-react";
import type { ExternalLink } from "@/lib/listing-data";

/** Small links row (IMDb, TMDB, etc.) on detail pages. */
export function ExternalLinks({
  links,
  className,
}: {
  links: ExternalLink[];
  className?: string;
}) {
  if (links.length === 0) return null;
  return (
    <ul
      aria-label="External links"
      className={`flex h-fit flex-wrap items-center gap-2 ${className ?? ""}`}
    >
      {links.map((link) => (
        <li key={link.href}>
          <a
            href={link.href}
            target="_blank"
            rel="noreferrer"
            className="flex h-9 items-center gap-2 rounded-full border border-border px-4 text-[13px] text-content-secondary transition-colors hover:border-[#48443f] hover:text-content"
          >
            <ExternalLinkIcon aria-hidden className="size-3.5" />
            {link.label}
          </a>
        </li>
      ))}
    </ul>
  );
}
