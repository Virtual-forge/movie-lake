"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import type {
  MouseEvent as ReactMouseEvent,
  PointerEvent as ReactPointerEvent,
} from "react";
import { useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore } from "react";
import { Bell, Flame, Menu, MessageSquare, Search, X } from "lucide-react";

import { UserMenu } from "@/components/user-menu";

const NAV_ITEMS = [
  { href: "/", label: "Discover" },
  { href: "/search?kind=movie", label: "Movies" },
  { href: "/search?kind=tv", label: "Series" },
  { href: "/search/advanced", label: "Advanced" },
] as const;

/**
 * Which nav item genuinely corresponds to the URL. Detail/genre/auth pages
 * highlight nothing (there is no honest parent button). Bare `/search` is
 * the "All" view — neither Movies nor Series owns it.
 */
function resolveActiveHref(
  pathname: string | null,
  searchParams: URLSearchParams | null,
): string | null {
  if (!pathname) return null;
  if (pathname === "/") return "/";
  if (pathname === "/search") {
    const kind = searchParams?.get("kind");
    if (kind === "tv") return "/search?kind=tv";
    if (kind === "movie") return "/search?kind=movie";
    return null;
  }
  if (pathname.startsWith("/search/advanced")) return "/search/advanced";
  return null;
}

interface NavIndicator {
  left: number;
  width: number;
}

/** URL-independent header body: identical with or without the resolved pathname. */
function HeaderBody({ activeHref }: { activeHref?: string | null }) {
  const [menuOpen, setMenuOpen] = useState(false);

  /* Desktop sliding indicator (M10): one bar glides from the previous
   * active item to the next whenever the routed page changes. Mounting
   * in place (bar === null -> value) never animates a false position. */
  const navRef = useRef<HTMLElement>(null);
  const linkRefs = useRef(new Map<string, HTMLAnchorElement>());
  const [indicator, setIndicator] = useState<NavIndicator | null>(null);

  useLayoutEffect(() => {
    function measure() {
      const nav = navRef.current;
      const link = activeHref ? linkRefs.current.get(activeHref) : undefined;
      if (!nav || !link) {
        setIndicator(null);
        return;
      }
      // The label span, never the leading icon (Discover carries a flame).
      const label = link.querySelector("span")?.getBoundingClientRect();
      const navRect = nav.getBoundingClientRect();
      setIndicator(
        label
          ? { left: label.left - navRect.left, width: label.width }
          : null,
      );
    }
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [activeHref]);

  /* Drawer (M10): always mounted, visibility/transform driven by CSS;
   * the drag gesture only writes inline styles while it overrides. */
  const panelRef = useRef<HTMLDivElement>(null);
  const navTriggerRef = useRef<HTMLButtonElement>(null);
  const dragRef = useRef({
    active: false,
    claimed: false,
    startX: 0,
    dx: 0,
    lastX: 0,
    lastT: 0,
    velocity: 0,
  });
  const suppressTap = useRef(false);
  const lastActiveHref = useRef<string | null | undefined>(activeHref);

  function onPanelPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (!menuOpen) return;
    dragRef.current = {
      active: true,
      claimed: false,
      startX: event.clientX,
      dx: 0,
      lastX: event.clientX,
      lastT: performance.now(),
      velocity: 0,
    };
  }

  function onPanelPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    if (!drag.active || !menuOpen) return;
    const dx = event.clientX - drag.startX;
    const panel = panelRef.current;
    if (!panel) return;

    if (!drag.claimed) {
      if (dx < 8) return; // not yet a rightward close gesture
      drag.claimed = true;
      try {
        panel.setPointerCapture(event.pointerId);
      } catch {
        // Best-effort; without it the drag just ends off-panel.
      }
      panel.style.transition = "none";
    }
    if (!drag.claimed) return;

    const now = performance.now();
    const dt = Math.max(now - drag.lastT, 1);
    drag.dx = Math.min(Math.max(dx, 0), panel.offsetWidth);
    panel.style.transform = `translateX(${drag.dx}px)`;
    drag.velocity = (event.clientX - drag.lastX) / dt;
    drag.lastX = event.clientX;
    drag.lastT = now;
  }

  function onPanelPointerUp() {
    const drag = dragRef.current;
    if (!drag.active) return;
    drag.active = false;
    if (!drag.claimed) return;

    const panel = panelRef.current;
    if (panel) {
      panel.style.transition = "";
      panel.style.transform = "";
    }
    // Follow the finger out when far enough or flicked; snap back otherwise.
    const shouldClose = drag.dx > 110 || (drag.velocity > 0.45 && drag.dx > 24);
    drag.claimed = false;
    // A genuine drag must not trigger the link release lands on.
    suppressTap.current = shouldClose || drag.dx > 8;
    if (shouldClose) setMenuOpen(false);
  }

  /** Swallow the click that follows a real drag so links don't open. */
  function onPanelClickCapture(event: ReactMouseEvent<HTMLDivElement>) {
    if (suppressTap.current) {
      event.preventDefault();
      event.stopPropagation();
      suppressTap.current = false;
    }
  }

  useEffect(() => {
    // Any post-open navigation closes the drawer — with links also
    // closing it on click, this covers router-driven changes.
    if (lastActiveHref.current !== activeHref) {
      lastActiveHref.current = activeHref;
      setMenuOpen(false);
    }
  }, [activeHref]);

  useEffect(() => {
    if (!menuOpen) return;
    const panel = panelRef.current;
    panel?.querySelector("a")?.focus({ preventScroll: true });
    document.body.style.overflow = "hidden";

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setMenuOpen(false);
        navTriggerRef.current?.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [menuOpen]);

  return (
    <header className="sticky top-0 z-50 border-b border-border bg-background">
      <div className="relative z-10 mx-auto flex h-14 w-full max-w-[1600px] items-center gap-4 px-5 md:h-16 md:gap-6 md:px-10 lg:px-14">
        <Link
          href="/"
          className="shrink-0 text-[10px] font-semibold leading-[1.35] tracking-[0.38em] text-content transition-colors hover:text-white md:text-[11px] md:tracking-[0.44em]"
          aria-label="Movie Lake — home"
        >
          <span className="block">MOVIE</span>
          <span className="block">LAKE</span>
        </Link>

        <nav
          aria-label="Primary"
          ref={navRef}
          className="relative hidden gap-1.5 lg:flex"
        >
          {NAV_ITEMS.map((item) => {
            const active = item.href === activeHref;
            return (
              <Link
                key={item.label}
                ref={(el) => {
                  if (el) linkRefs.current.set(item.href, el);
                  else linkRefs.current.delete(item.href);
                }}
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex items-center gap-1.5 rounded-md px-3 py-2 text-[12px] font-semibold uppercase tracking-[0.16em] transition-colors ${
                  active
                    ? "text-content"
                    : "text-content-secondary hover:text-content"
                }`}
              >
                {item.href === "/" && (
                  <Flame
                    aria-hidden
                    className={`size-3.5 ${active ? "text-content" : "text-content-muted"}`}
                  />
                )}
                <span>{item.label}</span>
              </Link>
            );
          })}
          {indicator && (
            <span
              data-testid="nav-indicator"
              aria-hidden
              className="absolute bottom-1 h-0.5 rounded-full bg-content transition-[left,width] duration-200 ease-out"
              style={{ left: indicator.left, width: indicator.width }}
            />
          )}
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
            ref={navTriggerRef}
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

      {/* Dimmed layer behind the drawer; starts below the bar so the close
          trigger stays live on top of it. */}
      <div
        aria-hidden
        data-open={menuOpen ? "true" : "false"}
        onClick={() => setMenuOpen(false)}
        className="drawer-backdrop fixed inset-x-0 bottom-0 top-14 bg-black/60 md:top-16 lg:hidden"
      />

      {/* Right-hand slide-in panel, draggable back out by gesture. `w-[…]`
          is load-bearing: a fixed box without width shrink-wraps to its
          labels, and the gesture math assumes the real drawer width.
          dragstart is cancelled because grabbing its links otherwise
          starts a native link drag that kills the pointer stream. */}
      <div
        id="mobile-nav"
        ref={panelRef}
        data-open={menuOpen ? "true" : "false"}
        onPointerDown={onPanelPointerDown}
        onPointerMove={onPanelPointerMove}
        onPointerUp={onPanelPointerUp}
        onPointerCancel={onPanelPointerUp}
        onDragStart={(event) => event.preventDefault()}
        onClickCapture={onPanelClickCapture}
        className="drawer-panel fixed bottom-0 right-0 top-14 z-20 w-[min(82vw,340px)] touch-none border-l border-border bg-background shadow-2xl md:top-16 lg:hidden"
      >
        <nav aria-label="Primary" className="flex w-full flex-col px-3 pb-6 pt-3">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.label}
              href={item.href}
              onClick={() => setMenuOpen(false)}
              aria-current={item.href === activeHref ? "page" : undefined}
              className={`flex h-13 items-center rounded-lg px-3 text-[13px] font-semibold uppercase tracking-[0.16em] transition-colors hover:bg-surface-elevated ${
                item.href === activeHref
                  ? "text-content"
                  : "text-content-secondary hover:text-content"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
    </header>
  );
}

/**
 * Resolves the current pathname + search params. URL data in a client
 * component blocks the generic prerender of dynamic routes (/movie/[id],
 * /tv/[id]), so the layout mounts this inside <Suspense> with <HeaderBody />
 * as the fallback; the resolved state streams in immediately after.
 */
/** True once the client tree is committed; false on server and first paint. */
const noopSubscribe = () => () => {};
function useHydrated(): boolean {
  return useSyncExternalStore(noopSubscribe, () => true, () => false);
}

export function SiteHeader() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  // First paint must match the streamed server output exactly (see
  // SiteHeaderFallback); the resolved active state is applied post-hydration.
  const activeHref = useHydrated() ? resolveActiveHref(pathname, searchParams) : null;
  return <HeaderBody activeHref={activeHref} />;
}

/** Instant-shell fallback: same markup, active state still unresolved. */
export function SiteHeaderFallback() {
  return <HeaderBody activeHref={null} />;
}
