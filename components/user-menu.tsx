"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ChevronDown, LogOut, UserRound } from "lucide-react";

import { signOut, useSession } from "@/lib/auth-client";

/**
 * The header account island. Reads the session client-side (Better Auth
 * react store) so the site shell never blocks a request read: server render
 * and first paint always show the neutral guest chip, and any resolved
 * session swaps in right after hydration.
 */
export function UserMenu() {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const [open, setOpen] = useState(false);
  const user = session?.user;

  function handleSignOut() {
    setOpen(false);
    void signOut().then(() => {
      router.push("/");
      router.refresh();
    });
  }

  if (!user) {
    return (
      <Link
        href="/login"
        aria-label={
          isPending ? "Sign in" : "Sign in — required to save favorites"
        }
        className="flex items-center gap-2.5 rounded-full py-1 pr-3 pl-1 text-left transition-colors hover:bg-white/5"
      >
        <span
          aria-hidden
          className="grid size-8 shrink-0 place-items-center rounded-full border border-border bg-surface-elevated text-content-secondary"
        >
          <UserRound className="size-4" />
        </span>
        <span className="hidden leading-tight sm:block">
          <span className="block text-[12px] font-medium text-content">
            Guest
          </span>
          <span className="block text-[10px] text-content-muted">Sign in</span>
        </span>
      </Link>
    );
  }

  const displayName = user.name || user.email || "Member";
  const initial = displayName.trim().charAt(0).toUpperCase();

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((wasOpen) => !wasOpen)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={`Account menu for ${displayName}`}
        className="flex items-center gap-2 rounded-full py-1 pr-1.5 pl-1 text-left transition-colors hover:bg-white/5"
      >
        <span
          aria-hidden
          className="grid size-8 shrink-0 place-items-center rounded-full border border-favorite/30 bg-favorite/10 text-[13px] font-semibold text-favorite"
        >
          {initial}
        </span>
        <span className="hidden max-w-[9rem] leading-tight sm:block">
          <span className="block truncate text-[12px] font-medium text-content">
            {displayName}
          </span>
          <span className="block truncate text-[10px] text-content-muted">
            {user.email}
          </span>
        </span>
        <ChevronDown aria-hidden className="size-4 text-content-secondary" />
      </button>

      {open && (
        <>
          {/* Click-away layer (keeps menu closing effect-free). */}
          <button
            type="button"
            tabIndex={-1}
            aria-label="Close account menu"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 cursor-default"
          />
          <div
            role="menu"
            aria-label="Account"
            className="absolute right-0 z-50 mt-2 w-44 rounded-xl border border-border bg-surface-elevated p-1.5 shadow-xl"
          >
            <Link
              role="menuitem"
              href="/profile"
              onClick={() => setOpen(false)}
              className="block rounded-lg px-3 py-2 text-[13px] text-content transition-colors hover:bg-white/5"
            >
              Your favorites
            </Link>
            <button
              role="menuitem"
              type="button"
              onClick={handleSignOut}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-[13px] text-content-secondary transition-colors hover:bg-white/5 hover:text-content"
            >
              <LogOut aria-hidden className="size-3.5" />
              Sign out
            </button>
          </div>
        </>
      )}
    </div>
  );
}
