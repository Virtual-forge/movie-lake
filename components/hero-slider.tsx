"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Play, Star } from "lucide-react";
import { formatRating } from "@/lib/format";
import type { Listing } from "@/types/listing";

const ROTATE_MS = 6500;

interface HeroSliderProps {
  slides: Listing[];
}

export function HeroSlider({ slides }: HeroSliderProps) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const reducedRef = useRef(false);

  useEffect(() => {
    reducedRef.current = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
  }, []);

  useEffect(() => {
    if (paused || reducedRef.current || slides.length < 2) return;
    const id = window.setInterval(
      () => setIndex((i) => (i + 1) % slides.length),
      ROTATE_MS,
    );
    return () => window.clearInterval(id);
  }, [paused, slides.length]);

  if (slides.length === 0) return null;

  return (
    <section
      aria-label="Featured titles"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      className="relative h-[300px] overflow-hidden rounded-2xl bg-surface sm:h-[340px] lg:h-[380px] lg:rounded-[24px]"
    >
      {slides.map((slide, i) => {
        const isActive = i === index;
        return (
          <div
            key={slide.route}
            aria-hidden={!isActive}
            className={`absolute inset-0 transition-opacity duration-500 ease-out ${
              isActive ? "opacity-100" : "pointer-events-none opacity-0"
            }`}
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
              aria-label={`View details for ${slide.title}`}
              className="absolute bottom-12 right-[12%] grid size-14 place-items-center rounded-full bg-black/50 ring-1 ring-white/25 transition-colors hover:bg-black/70 lg:size-[72px]"
            >
              <Play aria-hidden className="ml-0.5 size-6 fill-white text-white" />
            </Link>
          </div>
        );
      })}
    </section>
  );
}
