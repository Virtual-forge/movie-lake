"use client";

import {
  createContext,
  useCallback,
  useContext,
  useRef,
  useState,
} from "react";
import { TriangleAlert, X } from "lucide-react";

/**
 * Minimal accessible failure toasts (Phase 5: error boundaries & toasts).
 * Only server-action failures surface here — successes stay silent because
 * the optimistic toggle itself is the confirmation. The live region is
 * always mounted so screen readers announce late arrivals properly.
 *
 * Reason the old approach changed: FavoriteButton failures lived as an
 * sr-only alert inside the button — invisible to sighted users and clung
 * to the control instead of explaining what happened.
 */

type ToastItem = { id: number; message: string };

type PushToast = (message: string) => void;

const ToastContext = createContext<PushToast>(() => {});

export function useToast(): PushToast {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const nextId = useRef(1);

  const dismiss = useCallback((id: number) => {
    setItems((pending) => pending.filter((item) => item.id !== id));
  }, []);

  const push = useCallback<PushToast>(
    (message) => {
      const id = nextId.current++;
      setItems((pending) => [...pending.slice(-2), { id, message }]);
      window.setTimeout(() => dismiss(id), 6000);
    },
    [dismiss],
  );

  return (
    <ToastContext.Provider value={push}>
      {children}
      <div
        aria-live="assertive"
        aria-label="Notifications"
        className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex flex-col items-center gap-2 px-4"
      >
        {items.map((item) => (
          <div
            key={item.id}
            role="status"
            className="pointer-events-auto flex max-w-[560px] items-center gap-3 rounded-full border border-border bg-surface px-4 py-2.5 text-[13px] text-content shadow-[0_8px_30px_rgba(0,0,0,0.45)]"
          >
            <TriangleAlert aria-hidden className="size-4 shrink-0 text-favorite" />
            <span className="leading-snug">{item.message}</span>
            <button
              type="button"
              onClick={() => dismiss(item.id)}
              aria-label="Dismiss notification"
              className="grid size-6 shrink-0 place-items-center rounded-full text-content-muted transition-colors hover:bg-border hover:text-content"
            >
              <X aria-hidden className="size-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
