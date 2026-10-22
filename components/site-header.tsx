"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSyncExternalStore, useState } from "react";
import { Bell, Flame, Menu, MessageSquare, Search, X } from "lucide-react";

import { UserMenu } from "@/components/user-menu";

const NAV_ITEMS = [
  { href: "/", label: "Discover" },
  { href: "/search?kind=movie", label: "Movies" },
  { href: "/search?kind=tv", label: "Series" },
  { href: "/search/advanced", label: "Advanced" },
] as const;

/** URL-independent header body: identical with or without the resolved pathname. */
function HeaderBody({ discoverActive = false }: { discoverActive?: boolean }) {
  /**
   * Mobile menu (M8): below `lg` the primary nav is hidden entirely, which
   * left phones with no buttons for any page. A disclosure panel in the
   * same visual language restores them; it closes on link taps so it
   * never survives navigation.
   */
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background">
      <div className="mx-auto flex h-14 w-full max-w-[1600px] items-center gap-4 px-5 md:h-16 md:gap-6 md:px-10 lg:px-14">
        <Link
          href="/"
          className="shrink-0 text-[10px] font-semibold leading-[1.35] tracking-[0.38em] text-content transition-colors hover:text-white md:text-[11px] md:tracking-[0.44em]"
          aria-label="Movie Lake — home"
        >
          <span className="block">MOVIE</span>
          <span className="block">LAKE</span>
        </Link>

        <nav aria-label="Primary" className="hidden gap-1.5 lg:flex">
          {NAV_ITEMS.map((item) => {
            const isDiscover = item.href === "/";
            const active = isDiscover ? discoverActive : false;
            return (
              <Link
                key={item.label}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-1.5 rounded-md px-3 py-2 text-[12px] font-semibold uppercase tracking-[0.16em] transition-colors ${
                  active
                    ? "text-content"
                    : "text-content-secondary hover:text-content"
                }`}
              >
                {isDiscover && (
                  <Flame
                    aria-hidden
                    className={`size-3.5 ${active ? "text-content" : "text-content-muted"}`}
                  />
                )}
                <span className="flex flex-col items-center gap-1">
                  {item.label}
                  {active && <span className="block h-0.5 w-4 rounded-full bg-content" />}
                </span>
              </Link>
            );
          })}
        </nav>

        <form action="/search" role="search" className="ml-auto hidden min-w-0 md:block lg:ml-2">
          <div className="relative w-56 lg:w-72">
            <Search
              aria-hidden
              className="pointer-events-none absolute left-3.5 top-1/2 size-3.5 -translate-y-1/2 text-content-muted"
            />
            <input
              type="search"
              name="q"
              placeholder="Search"
              autoComplete="off"
              aria-label="Search movies and series"
              className="h-9 w-full rounded-full border border-border bg-surface pl-9 pr-3 text-[13px] text-content placeholder:text-content-muted focus:border-[#4a4744] focus:outline-none"
            />
          </div>
        </form>

        <div className="ml-auto flex items-center gap-1.5 md:gap-2.5">
          <Link
            href="/search"
            aria-label="Search"
            className="grid size-9 place-items-center rounded-md text-content-secondary transition-colors hover:text-content md:hidden"
          >
            <Search aria-hidden className="size-[17px]" />
          </Link>

          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-controls="mobile-nav"
            aria-label={menuOpen ? "Close menu" : "Open menu"}
            className="grid size-9 place-items-center rounded-md text-content-secondary transition-colors hover:text-content lg:hidden"
          >
            {menuOpen ? <X aria-hidden className="size-[18px]" /> : <Menu aria-hidden className="size-[18px]" />}
          </button>

          <button
            type="button"
            disabled
            title="Messaging arrives with a later phase"
            aria-label="Messages — not available yet"
            className="hidden size-9 place-items-center rounded-md text-content-secondary opacity-50 transition-colors sm:grid hover:title:text-content"
          >
            <MessageSquare aria-hidden className="size-[17px]" />
          </button>
          <button
            type="button"
            disabled
            title="Notifications arrive with a later phase"
            aria-label="Notifications — not available yet"
            className="hidden size-9 place-items-center rounded-md text-content-secondary opacity-50 transition-colors sm:grid"
          >
            <Bell aria-hidden className="size-[17px]" />
          </button>

          <span className="mx-1 hidden h-6 w-px bg-border sm:block" aria-hidden />

          <UserMenu />
        </div>
      </div>

      {menuOpen && (
        <div id="mobile-nav" className="border-t border-border lg:hidden">
          <nav
            aria-label="Primary"
            className="mx-auto flex w-full max-w-[1600px] flex-col px-5 py-2.5"
          >
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.label}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className="flex h-12 items-center rounded-md px-1 text-[13px] font-semibold uppercase tracking-[0.16em] text-content-secondary transition-colors hover:text-content"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  );
}

/**
 * Resolves the current pathname. URL data in a client component blocks the
 * generic prerender of dynamic routes (/movie/[id], /tv/[id]), so the layout
 * mounts this inside <Suspense> with <HeaderBody /> as the fallback; the
 * resolved state streams in immediately after.
 */
/** True once the client tree is committed; false on server and first paint. */
const noopSubscribe = () => () => {};
function useHydrated(): boolean {
  return useSyncExternalStore(noopSubscribe, () => true, () => false);
}

export function SiteHeader() {
  const pathname = usePathname();
  // First paint must match the streamed server output exactly (see
  // SiteHeaderFallback); the resolved active state is applied post-hydration.
  const discoverActive = useHydrated() && pathname === "/";
  return <HeaderBody discoverActive={discoverActive} />;
}

/** Instant-shell fallback: same markup, active state still unresolved. */
export function SiteHeaderFallback() {
  return <HeaderBody discoverActive={false} />;
}
