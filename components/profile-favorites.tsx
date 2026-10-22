"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useOptimistic, useState, useTransition } from "react";
import { HeartOff } from "lucide-react";

import type { FavoriteDTO } from "@/lib/favorites";
import { GENRE_LABELS } from "@/lib/genres";
import { tmdbImageUrl } from "@/lib/tmdb-image";

/**
 * The signed-in favorites grid. Server filter results arrive as props; the
 * remove button hides the card optimistically (useOptimistic inside the
 * transition, auto-restoring on failure) and revalidates the server list
 * with router.refresh() on success.
 */
export function ProfileFavoritesGrid({ favorites }: { favorites: FavoriteDTO[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [visibleFavorites, removeOptimistic] = useOptimistic(
    favorites,
    (state: FavoriteDTO[], removedId: string) =>
      state.filter((favorite) => favorite.id !== removedId),
  );
  const [, startTransition] = useTransition();

  function handleRemove(favorite: FavoriteDTO) {
    setError(null);
    startTransition(async () => {
      removeOptimistic(favorite.id);
      const response = await fetch(
        `/api/favorites?itemId=${encodeURIComponent(favorite.itemId)}`,
        { method: "DELETE" },
      );
      if (!response.ok) {
        setError("Could not remove the favorite — try again.");
        return;
      }
      router.refresh();
    });
  }

  if (visibleFavorites.length === 0) {
    return (
      <div className="rounded-2xl border border-border bg-surface px-6 py-14 text-center">
        <p className="text-[15px] font-medium text-content">
          Nothing matches this filter.
        </p>
        <p className="mt-1.5 text-[13px] text-content-secondary">
          <Link
            href="/profile"
            className="underline decoration-border underline-offset-2 transition-colors hover:text-content"
          >
            Show all favorites
          </Link>
        </p>
      </div>
    );
  }

  return (
    <div>
      {error ? (
        <p
          role="alert"
          className="mb-4 rounded-lg border border-favorite/30 bg-favorite/10 px-3 py-2 text-[12px] text-favorite"
        >
          {error}
        </p>
      ) : null}
      <ul className="grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {visibleFavorites.map((favorite) => (
          <FavoriteCard
            key={favorite.id}
            favorite={favorite}
            onRemove={handleRemove}
          />
        ))}
      </ul>
    </div>
  );
}

function FavoriteCard({
  favorite,
  onRemove,
}: {
  favorite: FavoriteDTO;
  onRemove: (favorite: FavoriteDTO) => void;
}) {
  const poster = favorite.posterPath
    ? tmdbImageUrl(favorite.posterPath, "w342")
    : undefined;

  return (
    <li className="group relative min-w-0">
      <Link
        href={favorite.itemId}
        className="block min-w-0 scroll-ml-4"
      >
        <div className="relative aspect-[2/3] overflow-hidden rounded-xl bg-surface ring-1 ring-transparent transition-[box-shadow] group-hover:ring-1 group-hover:ring-white/20">
          {poster ? (
            <Image
              src={poster}
              alt={`${favorite.title} poster`}
              fill
              sizes="(max-width: 640px) 46vw, (max-width: 1024px) 30vw, 220px"
              className="object-cover"
            />
          ) : (
            <div
              className="grid h-full place-items-center px-3 text-center text-[12px] text-content-muted"
              aria-label={`${favorite.title} — no poster art`}
            >
              {favorite.title}
            </div>
          )}
        </div>
        <div className="mt-2.5">
          <p className="truncate text-[13px] font-medium text-content">
            {favorite.title}
          </p>
          <p className="mt-0.5 truncate text-[11px] text-content-secondary">
            {[favorite.year, favorite.type === "MOVIE" ? "Film" : "Series"]
              .filter(Boolean)
              .join(" • ")}
          </p>
          <p className="mt-1 line-clamp-2 text-[11px] leading-snug text-content-muted">
            {favorite.genres
              .slice(0, 3)
              .map((slug) => GENRE_LABELS[slug as keyof typeof GENRE_LABELS] ?? slug)
              .join(", ")}
          </p>
        </div>
      </Link>
      <button
        type="button"
        onClick={() => onRemove(favorite)}
        aria-label={`Remove ${favorite.title} from favorites`}
        title="Remove from favorites"
        className="absolute right-2 top-2 grid size-8 place-items-center rounded-full border border-border bg-background/80 text-content-secondary backdrop-blur transition-colors hover:text-favorite"
      >
        <HeartOff aria-hidden className="size-3.5" />
      </button>
    </li>
  );
}

/** Instant-shell placeholder while the profile streams in. */
export function ProfileFavoritesFallback() {
  return (
    <p className="text-[13px] text-content-muted" aria-busy>
      Loading your favorites…
    </p>
  );
}
