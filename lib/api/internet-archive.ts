import { z } from "zod";

/**
 * Internet Archive client (docs/PROJECT_PLAN.md → "Internet Archive
 * Client"): read-only, keyless metadata API used to verify the curated
 * FreeFilm items each time their watch page renders. IA metadata is
 * free-form JSON, so everything the watch page shows is validated here —
 * anything that fails validation counts as "verifying failed" and the
 * watch page falls back honestly instead of embedding a broken player.
 *
 * License claims are NEVER inferred from the API response alone; the
 * seeded `FreeFilm.license`/`licenseUrl` record is the human-verified
 * source. This client only confirms the item exists, is a movie, and is
 * playable, and reports its machine-readable license URL when present.
 */

const ARCHIVE_BASE = "https://archive.org";
const REQUEST_TIMEOUT_MS = 10_000;

const ArchiveFileInfo = z.object({
  name: z.string(),
  format: z.string().optional(),
  // IA stores sizes/lengths/heights as numbers or numeric strings, and
  // lengths sometimes arrive as "01:19:29"-style clock strings. Junk or
  // unknown shapes degrade to undefined — one bad derivative must never
  // fail the whole item.
  size: z.coerce.number().finite().optional().catch(undefined),
  height: z.coerce.number().finite().optional().catch(undefined),
  length: z
    .union([
      z.coerce.number().finite(),
      z.string().regex(/^(\d+(\.\d+)?)(:(\d+(\.\d+)?){0,2})?$/),
    ])
    .transform((value) =>
      typeof value === "number"
        ? value
        : value
            .split(":")
            .map(Number)
            .reduce((total, part) => total * 60 + part),
    )
    .optional()
    .catch(undefined),
});
export type ArchiveFileInfo = z.infer<typeof ArchiveFileInfo>;

/** True for derivative names like "…-1of5_512kb.mp4" (underscore follows the
 * trailing digit, so \b would break — match the part pattern plainly). */
function isSplitPart(name: string): boolean {
  return /\d+of\d+/i.test(name);
}

const MetadataDict = z.object({
  title: z.string().optional(),
  /** IA stores dates free-form ("1902", "1922", "1955-…"); kept as text. */
  date: z.string().optional(),
  mediatype: z.string(),
  /** Machine-readable license on the item itself (e.g. CC BY 3.0 items). */
  licenseurl: z.string().optional(),
  rights: z.string().optional(),
});

export const archiveMetadataSchema = z.object({
  metadata: MetadataDict,
  files: z.array(ArchiveFileInfo).default([]),
});
export type ArchiveMetadataResponse = z.infer<typeof archiveMetadataSchema>;

export class ArchiveError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = "ArchiveError";
    this.status = status;
  }
}

async function fetchArchiveMetadata(
  identifier: string,
): Promise<ArchiveMetadataResponse> {
  let response: Response;
  const url = `${ARCHIVE_BASE}/metadata/${encodeURIComponent(identifier)}/`;
  try {
    response = await fetch(url, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    throw new ArchiveError(
      `Internet Archive request to ${url} failed: ${error instanceof Error ? error.message : "network failure"}`,
      0,
    );
  }
  if (!response.ok) {
    // archive.org answers 404 for unknown identifiers — the honest watch
    // page treats a missing item exactly like an unreachable one.
    throw new ArchiveError(
      `Internet Archive responded ${response.status} for ${identifier}`,
      response.status,
    );
  }
  let json: unknown;
  try {
    json = await response.json();
  } catch {
    throw new ArchiveError(
      `Internet Archive returned invalid JSON for ${identifier}`,
      response.status,
    );
  }
  const parsed = archiveMetadataSchema.safeParse(json);
  if (!parsed.success) {
    throw new ArchiveError(
      `Internet Archive metadata for ${identifier} failed shape validation`,
      response.status,
    );
  }
  return parsed.data;
}

/* ------------------------------------------------------------------ */
/* Pure helpers (unit-tested against recorded fixtures)                */
/* ------------------------------------------------------------------ */

function isVideoFile(file: ArchiveFileInfo): boolean {
  return (
    /\.mp4$/i.test(file.name) ||
    /MPEG4/i.test(file.format ?? "") ||
    /h\.264/i.test(file.format ?? "")
  );
}

/**
 * Pick one standalone, browser-playable stream for the no-JS direct link:
 * the largest .mp4 whose name is not a part of a split item
 * ("…-1of5_512kb.mp4"). Split items and part-less files yield undefined —
 * the embed or the item page then handles playback.
 */
export function pickStandaloneVideoFile(
  files: ArchiveFileInfo[],
): string | undefined {
  const standalone = files.filter(
    (file) => /\.mp4$/i.test(file.name) && !isSplitPart(file.name),
  );
  if (standalone.length === 0) return undefined;
  return standalone.reduce((best, file) =>
    (file.size ?? 0) > (best.size ?? 0) ? file : best,
  ).name;
}

/**
 * Running time (seconds) as distributed: split items report one length per
 * part, so part files are summed; single-file items take the longest known
 * video length. Undefined when nothing is known (honest no-claim).
 */
export function videoRuntimeSeconds(
  files: ArchiveFileInfo[],
): number | undefined {
  const video = files.filter(isVideoFile);
  const withLength = (list: ArchiveFileInfo[]) =>
    list
      .map((file) => file.length)
      .filter((value): value is number => typeof value === "number");

  const parts = video.filter((file) => isSplitPart(file.name));
  if (parts.length > 0) {
    const lengths = withLength(parts);
    if (lengths.length > 0) {
      // Integer seconds: per-part decimals carry derivative noise.
      return Math.round(lengths.reduce((total, value) => total + value, 0));
    }
    return undefined;
  }
  const lengths = withLength(video);
  if (lengths.length === 0) return undefined;
  return Math.round(Math.max(...lengths));
}

/* ------------------------------------------------------------------ */
/* View                                                                */
/* ------------------------------------------------------------------ */

export interface ArchiveItemView {
  identifier: string;
  /** IA's own title for the item (may differ from the film's TMDB title). */
  itemTitle?: string;
  /** Claimed IA item date, as-is (e.g. "1902" or the noisy "1955"). */
  itemDate?: string;
  /** Machine-readable license on the item, when the item declares one. */
  itemLicenseUrl?: string;
  runtimeSeconds?: number;
  /** One file to stream directly (no-JS fallback), when the item has one. */
  directFile?: string;
}

/**
 * Resolve + verify an item for watch-page use. `null` means the item could
 * not be verified right now (network, HTTP error, schema, wrong mediatype,
 * or no playable video files) — the caller must degrade honestly instead
 * of embedding.
 */
export async function archiveItemView(
  identifier: string,
): Promise<ArchiveItemView | null> {
  let payload: ArchiveMetadataResponse;
  try {
    payload = await fetchArchiveMetadata(identifier);
  } catch {
    return null;
  }

  if (payload.metadata.mediatype !== "movies") return null;
  if (!payload.files.some(isVideoFile)) return null;

  return {
    identifier,
    itemTitle: payload.metadata.title,
    itemDate: payload.metadata.date,
    itemLicenseUrl: payload.metadata.licenseurl,
    runtimeSeconds: videoRuntimeSeconds(payload.files),
    directFile: pickStandaloneVideoFile(payload.files),
  };
}
