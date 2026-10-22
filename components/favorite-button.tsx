"use client";

import { useRouter } from "next/navigation";
import { Heart } from "lucide-react";

import { favoriteSnapshotFromListing } from "@/lib/favorites";
import { useSession } from "@/lib/auth-client";
import type { Listing } from "@/types/listing";
import { useFavoriteActions, useFavorites } from "@/components/favorites-store";
import { useToast } from "@/components/toast";

/**
 * The favorite toggle. Server-backed favorites mean three honest states:
 *
 * - resolving (session request in flight): temporarily disabled so a fast
 *   click is neither misread as "guest" for a signed-in user nor lost —
 *   SSR and first paint render this exact state, matching hydration;
 * - guest (session resolved to null): clicking routes to /login?redirect=;
 * - signed in: optimistic DB toggle with rollback on failure, surfaced as
 *   a toast (the old sr-only alert was invisible to sighted users).
 */
export function FavoriteButton({ listing }: { listing: Listing }) {
  const router = useRouter();
  const { data: session, isPending } = useSession();
  const userId = session?.user?.id;
  const favorites = useFavorites(Boolean(userId));
  const { addFavorite, removeFavorite } = useFavoriteActions();
  const pushToast = useToast();

  const on =
    favorites.data?.some(
      (favorite) => favorite.itemId === listing.route,
    ) === true;

  function handleFailure() {
    pushToast(
      "Your favorites didn't update just now — the server didn't respond. Try again in a moment.",
    );
  }

  function handleClick() {
    if (isPending) {
      return; // session still resolving — wait for the honest state
    }
    if (!userId) {
      router.push(`/login?redirect=${encodeURIComponent(listing.route)}`);
      return;
    }
    if (on) {
      removeFavorite.mutate(listing.route, { onError: handleFailure });
    } else {
      addFavorite.mutate(
        {
          itemId: listing.route,
          ...favoriteSnapshotFromListing(listing),
        },
        { onError: handleFailure },
      );
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      aria-pressed={on}
      aria-label={
        on
          ? `Remove ${listing.title} from favorites`
          : `Add ${listing.title} to favorites`
      }
      title={
        isPending
          ? "Checking your session…"
          : userId
            ? on
              ? "Saved in your favorites"
              : "Save to favorites"
            : "Sign in to save favorites"
      }
      className={`flex h-10 items-center gap-2 rounded-full border px-4 text-[13px] font-medium transition-colors disabled:cursor-progress disabled:opacity-70 ${
        on
          ? "border-favorite/40 bg-favorite/10 text-favorite"
          : "border-border text-content-secondary hover:border-[#48443f] hover:text-content"
      }`}
    >
      <Heart aria-hidden className={`size-4 ${on ? "fill-current" : ""}`} />
      {on ? "In favorites" : "Favorite"}
    </button>
  );
}
