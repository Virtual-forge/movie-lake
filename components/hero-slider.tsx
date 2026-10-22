"use client";

import Image from "next/image";
import Link from "next/link";
import {
  useEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { Play, Star } from "lucide-react";
import { formatRating } from "@/lib/format";
import type { Listing } from "@/types/listing";

const ROTATE_MS = 6500;
/** Horizontal px before the gesture belongs to the slider (M9 threshold). */
const DRAG_CLAIM_PX = 10;
/** Release distance that commits an adjacent slide. */
const SWIPE_COMMIT_PX = 60;
/** Release velocity (px/ms) that commits a short flick. */
const SWIPE_FLICK_VELOCITY = 0.45;

interface HeroSliderProps {
  slides: Listing[];
}

export function HeroSlider({ slides }: HeroSliderProps) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const reducedRef = useRef(false);

  /**
   * Drag slide (M11): one horizontal track; any pointer type swaps slides
   * with the gesture. The M9 lessons are load-bearing again — capture only
   * after the claim threshold, cancel native image/link drag, and swallow
   * the click a committed gesture releases on. `touch-action: pan-y` hands
   * vertical swipes to the page scroll and keeps horizontal to the slider.
   */
  const trackRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef({
    active: false,
    claimed: false,
    startX: 0,
    dx: 0,
    lastX: 0,
    lastT: 0,
    velocity: 0,
  });
  const draggingRef = useRef(false);
  const suppressTap = useRef(false);
  const lastGestureAt = useRef(0);
  const indexRef = useRef(0);

  useEffect(() => {
    indexRef.current = index;
    if (!draggingRef.current) applyTrack(0);
  }, [index]);

  useEffect(() => {
    reducedRef.current = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
  }, []);

  useEffect(() => {
    if (paused || reducedRef.current || slides.length < 2) return;
    const id = window.setInterval(() => {
      if (draggingRef.current) return; // hold the cursor's slide mid-gesture
      if (performance.now() - lastGestureAt.current < 700) return; // let a release settle
      setIndex((i) => (i + 1) % slides.length);
    }, ROTATE_MS);
    return () => window.clearInterval(id);
  }, [paused, slides.length]);

  /** Position the track for the current index plus a live-drag offset. */
  function applyTrack(pixels: number) {
    const track = trackRef.current;
    if (!track) return;
    track.style.transform = `translateX(calc(${-indexRef.current * 100}% + ${pixels}px))`;
  }

  function onHeroPointerDown(event: ReactPointerEvent<HTMLElement>) {
    if (slides.length < 2) return;
    // A new gesture rearms release-swallowing (M9 pattern: programmatic
    // clicks stay swallowable until the next pointerdown).
    suppressTap.current = false;
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

  function onHeroPointerMove(event: ReactPointerEvent<HTMLElement>) {
    const drag = dragRef.current;
    // All pointer types (mouse/touch/pen) drag the slider.
    if (!drag.active) return;
    const dx = event.clientX - drag.startX;
    if (!drag.claimed) {
      if (Math.abs(dx) < DRAG_CLAIM_PX) return;
      drag.claimed = true;
      draggingRef.current = true;
      const section = event.currentTarget;
      try {
        section.setPointerCapture(event.pointerId);
      } catch {
        // Best-effort as on the rails; the drag just ends off-element.
      }
      if (trackRef.current) trackRef.current.style.transition = "none";
    }
    if (!drag.claimed) return;

    const now = performance.now();
    drag.dx = dx;
    drag.velocity = (event.clientX - drag.lastX) / Math.max(now - drag.lastT, 1);
    drag.lastX = event.clientX;
    drag.lastT = now;
    applyTrack(dx);
  }

  function endHeroDrag(event: ReactPointerEvent<HTMLElement>) {
    const drag = dragRef.current;
    if (!drag.active) return;
    drag.active = false;
    if (!drag.claimed) return;
    drag.claimed = false;
    draggingRef.current = false;
    lastGestureAt.current = performance.now();
    suppressTap.current = true; // a commit/snap must not open slide links
    try {
      event.currentTarget.releasePointerCapture(event.pointerId);
    } catch {
      // already released by the pointer teardown
    }
    const committed =
      Math.abs(drag.dx) > SWIPE_COMMIT_PX ||
      (Math.abs(drag.velocity) > SWIPE_FLICK_VELOCITY && Math.abs(drag.dx) > DRAG_CLAIM_PX);
    if (trackRef.current) trackRef.current.style.transition = "";
    if (committed) {
      const direction = drag.dx < 0 ? 1 : -1;
      // Faces clamp (no wrap mid-gesture); autoplay and dots still wrap.
      const next = Math.min(Math.max(indexRef.current + direction, 0), slides.length - 1);
      setIndex(next);
      applyTrack(0);
    } else {
      applyTrack(0);
    }
  }

  function onHeroClickCapture(event: ReactMouseEvent<HTMLElement>) {
    // Swallow while armed; the NEXT pointerdown disarms (see onHeroPointerDown),
    // so drag releases keep suppressing even after a background click.
    if (suppressTap.current) {
      event.preventDefault();
      event.stopPropagation();
    }
  }

  if (slides.length === 0) return null;

  return (
    <section
      aria-label="Featured titles"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      onPointerDown={onHeroPointerDown}
      onPointerMove={onHeroPointerMove}
      onPointerUp={endHeroDrag}
      onPointerCancel={endHeroDrag}
      onDragStart={(event) => event.preventDefault()}
      onClickCapture={onHeroClickCapture}
      className="relative h-[300px] touch-pan-y overflow-hidden rounded-2xl bg-surface sm:h-[340px] lg:h-[380px] lg:rounded-[24px]"
    >
      <div ref={trackRef} data-testid="hero-track" className="flex h-full">
        {slides.map((slide, i) => {
          const isActive = i === index;
          return (
            <div
              key={slide.route}
              aria-hidden={!isActive}
              inert={!isActive || undefined}
              className={`relative h-full w-full shrink-0 ${isActive ? "" : "pointer-events-none"}`}
            >
              <Image
                src={slide.backdrop ?? slide.poster}
                alt=""
                fill
                priority={i === 0}
                sizes="(min-width: 1024px) 68vw, 100vw"
                className="object-cover"
              />
              {/* Legibility gradients — kept minimal per spec */}
              <div
                aria-hidden
                className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/25 to-black/15"
              />
              <div
                aria-hidden
                className="absolute inset-0 bg-gradient-to-r from-black/55 via-transparent to-transparent"
              />

              <div className="absolute bottom-5 left-5 right-5 max-w-xl lg:bottom-10 lg:left-10">
                <p className="text-[13px] text-content-secondary">{slide.year}</p>
                <h2 className="mt-2 text-[clamp(2rem,4vw,3.75rem)] font-bold leading-[1.0] tracking-[-0.015em] text-content">
                  {slide.title}
                </h2>
                <div className="mt-3.5 flex flex-wrap items-center gap-2 text-[12px]">
                  {slide.rating !== undefined && (
                    <span className="flex items-center gap-1.5 text-content">
                      <Star aria-hidden className="size-3.5 fill-current" />
                      <span className="font-medium tabular-nums">
                        {formatRating(slide.rating)}
                      </span>
                      <span className="sr-only">/ 10 rating</span>
                    </span>
                  )}
                  {slide.contentRating !== undefined && (
                    <span className="rounded-[5px] border border-white/25 px-1.5 py-px text-[10px] leading-[1.5] text-content">
                      {slide.contentRating}
                    </span>
                  )}
                  {slide.network !== undefined && (
                    <span className="rounded-[5px] border border-white/25 px-1.5 py-px text-[10px] leading-[1.5] text-content">
                      {slide.network}
                    </span>
                  )}
                  {slide.distributor !== undefined && (
                    <span className="rounded-[5px] border border-white/25 px-1.5 py-px text-[10px] leading-[1.5] text-content">
                      {slide.distributor}
                    </span>
                  )}
                  <span className="rounded-[5px] border border-white/25 px-1.5 py-px text-[10px] leading-[1.5] text-content">
                    {slide.kind === "film" ? "Film" : "Series"}
                  </span>
                </div>
              </div>

              <Link
                href={slide.route}
                tabIndex={isActive ? 0 : -1}
                aria-label={`View details for ${slide.title}`}
                className="absolute bottom-12 right-[12%] grid size-14 place-items-center rounded-full bg-black/50 ring-1 ring-white/25 transition-colors hover:bg-black/70 lg:size-[72px]"
              >
                <Play aria-hidden className="ml-0.5 size-6 fill-white text-white" />
              </Link>
            </div>
          );
        })}
      </div>

      <div className="absolute left-5 top-5 flex items-center gap-1.5 lg:left-10">
        {slides.map((s, j) => (
          <button
            key={s.route}
            type="button"
            onClick={() => setIndex(j)}
            aria-label={`Show featured title: ${s.title}`}
            aria-current={j === index ? "true" : undefined}
            className={`size-1.5 rounded-full transition-colors ${
              j === index ? "bg-white" : "bg-white/30 hover:bg-white/60"
            }`}
          />
        ))}
      </div>
    </section>
  );
}
