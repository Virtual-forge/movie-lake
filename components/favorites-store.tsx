"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import {
  parseFavoriteRoute,
  type FavoriteDTO,
} from "@/lib/favorites";

/**
 * Favorites as server state (Better Auth session + Supabase... rather:
 * Postgres via `/api/favorites`). The old localStorage seam is gone:
 * guests see honest sign-in prompts, and signed-in users get optimistic
 * toggles with rollback on failure.
 */

export const FAVORITES_QUERY_KEY = ["favorites"] as const;

async function fetchFavorites(): Promise<FavoriteDTO[] | null> {
  const response = await fetch("/api/favorites", {
    headers: { accept: "application/json" },
  });
  if (response.status === 401) return null; // signed out → no favorites
  if (!response.ok) {
    throw new Error(`Favorites request failed (${response.status})`);
  }
  return (await response.json()) as FavoriteDTO[];
}

/**
 * Favorites list for the signed-in user. Gates on the session hook state
 * from the caller (`enabled`): SSR and first paint always render the
 * neutral state, matching the streamed server output exactly.
 */
export function useFavorites(enabled: boolean) {
  return useQuery({
    queryKey: FAVORITES_QUERY_KEY,
    queryFn: fetchFavorites,
    enabled,
  });
}

export interface FavoriteToggleInput {
  itemId: string;
  title: string;
  posterPath?: string;
  genres: string[];
  year?: number;
}

function optimisticFavorite(input: FavoriteToggleInput): FavoriteDTO {
  const target = parseFavoriteRoute(input.itemId);
  return {
    id: `temp:${input.itemId}`,
    itemId: input.itemId,
    type: target?.type ?? "MOVIE",
    title: input.title,
    posterPath: input.posterPath ?? "",
    genres: input.genres,
    year: input.year,
    createdAt: new Date().toISOString(),
  };
}

/** Optimistic add/remove with rollback; settles by refetching the truth. */
export function useFavoriteActions() {
  const queryClient = useQueryClient();

  const addFavorite = useMutation({
    mutationFn: async (input: FavoriteToggleInput) => {
      const response = await fetch("/api/favorites", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(input),
      });
      if (!response.ok) {
        throw new Error(
          (await response
            .json()
            .catch(() => null)
            .then((body) => body?.error)) ?? `Save failed (${response.status})`,
        );
      }
    },
    onMutate: (input) => {
      const previous = queryClient.getQueryData<FavoriteDTO[]>(
        FAVORITES_QUERY_KEY,
      );
      queryClient.setQueryData<FavoriteDTO[] | null>(
        FAVORITES_QUERY_KEY,
        (current) => {
          if (!current) return [optimisticFavorite(input)];
          if (current.some((favorite) => favorite.itemId === input.itemId)) {
            return current;
          }
          return [optimisticFavorite(input), ...current];
        },
      );
      return { previous };
    },
    onError: (_error, _input, context) => {
      if (context?.previous) {
        queryClient.setQueryData(FAVORITES_QUERY_KEY, context.previous);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: FAVORITES_QUERY_KEY });
    },
  });

  const removeFavorite = useMutation({
    mutationFn: async (itemId: string) => {
      const response = await fetch(
        `/api/favorites?itemId=${encodeURIComponent(itemId)}`,
        { method: "DELETE" },
      );
      if (!response.ok) {
        throw new Error(
          (await response
            .json()
            .catch(() => null)
            .then((body) => body?.error)) ??
            `Remove failed (${response.status})`,
        );
      }
    },
    onMutate: (itemId) => {
      const previous = queryClient.getQueryData<FavoriteDTO[]>(
        FAVORITES_QUERY_KEY,
      );
      queryClient.setQueryData<FavoriteDTO[] | null>(
        FAVORITES_QUERY_KEY,
        (current) =>
          current
            ? current.filter((favorite) => favorite.itemId !== itemId)
            : current,
      );
      return { previous };
    },
    onError: (_error, _itemId, context) => {
      if (context?.previous) {
        queryClient.setQueryData(FAVORITES_QUERY_KEY, context.previous);
      }
    },
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: FAVORITES_QUERY_KEY });
    },
  });

  return { addFavorite, removeFavorite };
}
