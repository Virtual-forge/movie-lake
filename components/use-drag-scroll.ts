"use client";

import { useCallback, useRef } from "react";
import type { MouseEvent as ReactMouseEvent, PointerEvent as ReactPointerEvent, RefObject } from "react";

/**
 * Mouse/pen drag-to-scroll for horizontal rails (M9). Touch is untouched —
 * the browser pans it natively; pointer handlers only claim mouse/pen
 * gestures. All gesture state lives in refs so re-renders never interrupt
 * a drag.
 *
 * Design notes:
 * - A 4px threshold gates the claim, so quick clicks still reach the cards
 *   (the capture-phase click handler only swallows real drags).
 * - `scroll-snap` is disabled while the pointer owns the position, then
 *   restored after the glide settles — otherwise mandatory snap fights
 *   every manual scrollLeft move.
 * - Release gives a short momentum glide (0.94 decay per frame), skipped
 *   for prefers-reduced-motion.
 */
export function useDragScroll(ref: RefObject<HTMLElement | null>) {
  const down = useRef(false);
  const dragging = useRef(false);
  const startX = useRef(0);
  const startScrollLeft = useRef(0);
  const lastScrollLeft = useRef(0);
  const lastT = useRef(0);
  const velocity = useRef(0); // px per ms, scrollLeft direction
  const suppressClick = useRef(false);
  const glideRef = useRef<number | null>(null);

  const stopGlide = useCallback(() => {
    if (glideRef.current !== null) {
      cancelAnimationFrame(glideRef.current);
      glideRef.current = null;
    }
  }, []);

  const release = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    down.current = false;
    if (!dragging.current) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const speed = velocity.current;
    // Cap the impulse: a clamp keeps an anomalous input burst from
    // producing a multi-second glide.
    let frameSpeed = Math.sign(speed) * Math.min(Math.abs(speed), 2.2);
    if (!reduced && Math.abs(speed) > 0.25) {
      let lastFrame = performance.now();
      const glide = (now: number) => {
        const dt = Math.min(now - lastFrame, 64); // cap tab-stall resume
        lastFrame = now;
        el.scrollLeft += frameSpeed * dt;
        frameSpeed *= Math.pow(0.9, dt / 16); // time-consistent decay
        if (Math.abs(frameSpeed * 16) > 0.2) {
          glideRef.current = requestAnimationFrame(glide);
        } else {
          glideRef.current = null;
          el.style.scrollSnapType = ""; // snap takes over again
        }
      };
      glideRef.current = requestAnimationFrame(glide);
    } else {
      el.style.scrollSnapType = "";
    }
    dragging.current = false;
    suppressClick.current = true;
  }, [ref]);

  function onPointerDown(event: ReactPointerEvent<HTMLElement>) {
    // Touch pans natively claiming the gesture would fight the browser.
    if (event.pointerType !== "mouse" && event.pointerType !== "pen") return;
    if (event.button !== 0) return;
    const el = ref.current;
    if (!el) return;
    stopGlide();
    down.current = true;
    dragging.current = false;
    suppressClick.current = false;
    startX.current = event.clientX;
    startScrollLeft.current = el.scrollLeft;
    lastScrollLeft.current = el.scrollLeft;
    lastT.current = performance.now();
    velocity.current = 0;
  }

  function onPointerMove(event: ReactPointerEvent<HTMLElement>) {
    if (!down.current) return;
    const el = ref.current;
    if (!el) return;

    const dx = event.clientX - startX.current;
    if (!dragging.current) {
      if (Math.abs(dx) <= 4) return; // threshold: still possibly a click
      // Capture is claimed HERE, not on pointerdown: capture retargets the
      // follow-up click to this element, which would kill card links on
      // every plain press.
      dragging.current = true;
      try {
        el.setPointerCapture(event.pointerId);
      } catch {
        // Best-effort; without it the drag just ends off-element.
      }
      el.style.scrollSnapType = "none";
      el.style.userSelect = "none";
    }
    const now = performance.now();
    const dt = Math.max(now - lastT.current, 1);
    const newLeft = startScrollLeft.current - dx;
    el.scrollLeft = newLeft;
    velocity.current = (newLeft - lastScrollLeft.current) / dt;
    lastScrollLeft.current = newLeft;
    lastT.current = now;
  }

  function onPointerUp() {
    release();
  }

  function onPointerCancel() {
    release();
  }

  /** Swallow the click that follows a real drag so cards don't open. */
  function onClickCapture(event: ReactMouseEvent<HTMLElement>) {
    if (suppressClick.current) {
      event.preventDefault();
      event.stopPropagation();
      suppressClick.current = false;
    }
  }

  /** Native image/HTML drag steals the pointer stream (pointercancel) —
   * carousels are scroll controls, never drag-and-drop sources. */
  function onDragStart(event: {
    preventDefault: () => void;
  }) {
    event.preventDefault();
  }

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp,
    onPointerCancel,
    onClickCapture,
    onDragStart,
  };
}