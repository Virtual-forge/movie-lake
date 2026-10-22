"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Listing } from "@/types/listing";
import { PosterCard } from "@/components/poster-card";
import { useDragScroll } from "@/components/use-drag-scroll";

interface PosterRailProps {
  title: string;
  items: Listing[];
}

export function PosterRail({ title, items }: PosterRailProps) {
  const scroller = useRef<HTMLUListElement>(null);
  const [scrolled, setScrolled] = useState({ left: false, right: true });
  const drag = useDragScroll(scroller);

  function updateEdges() {
    const el = scroller.current;
    if (!el) return;
    setScrolled({
      left: el.scrollLeft > 8,
      right: el.scrollLeft + el.clientWidth < el.scrollWidth - 8,
    });
  }

  useEffect(() => {
    updateEdges();
  }, []);

  function scrollBy(direction: 1 | -1) {
    const el = scroller.current;
    if (!el) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy({
      left: direction * (el.clientWidth - 160),
      behavior: reduced ? "auto" : "smooth",
    });
  }

  return (
    <section aria-label={title} className="flex flex-col">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-2xl font-semibold tracking-tight text-content">
          {title}
        </h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => scrollBy(-1)}
            disabled={!scrolled.left}
            aria-label={`Scroll ${title.toLowerCase()} back`}
            className="grid size-10 place-items-center rounded-full border border-border text-content-secondary transition-colors hover:bg-surface-elevated hover:text-content disabled:cursor-default disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-content-secondary"
          >
            <ChevronLeft aria-hidden className="size-4.5" />
          </button>
          <button
            type="button"
            onClick={() => scrollBy(1)}
            disabled={!scrolled.right}
            aria-label={`Scroll ${title.toLowerCase()} forward`}
            className="grid size-10 place-items-center rounded-full border border-border text-content-secondary transition-colors hover:bg-surface-elevated hover:text-content disabled:cursor-default disabled:opacity-40 disabled:hover:bg-transparent disabled:hover:text-content-secondary"
          >
            <ChevronRight aria-hidden className="size-4.5" />
          </button>
        </div>
      </div>

      <ul
        ref={scroller}
        {...drag}
        onScroll={updateEdges}
        className="-mx-1 flex snap-x snap-mandatory gap-4 overflow-x-auto px-1 pb-2 scrollbar-none cursor-grab active:cursor-grabbing"
      >
        {items.map((item, index) => (
          <li
            key={item.route}
            className="w-[46vw] shrink-0 sm:w-[31vw] lg:w-[13.2%] lg:min-w-[160px]"
          >
            <PosterCard item={item} eager={index < 3} entryIndex={index} />
          </li>
        ))}
      </ul>
    </section>
  );
}
