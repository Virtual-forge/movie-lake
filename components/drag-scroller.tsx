"use client";

import type { ReactNode } from "react";
import { useRef } from "react";
import { useDragScroll } from "@/components/use-drag-scroll";

/**
 * Horizontal scroll list with mouse/pen drag-to-scroll layered on top of
 * native wheel/touch/keyboard scrolling (M9). Server rails render their
 * items as children; the list element itself is client so the pointer
 * handlers exist without converting every rail.
 */
export function DragScroller({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLUListElement>(null);
  const drag = useDragScroll(ref);

  return (
    <ul
      ref={ref}
      {...drag}
      className={`cursor-grab active:cursor-grabbing ${className ?? ""}`}
    >
      {children}
    </ul>
  );
}
