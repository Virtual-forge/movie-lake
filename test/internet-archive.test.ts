import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  archiveMetadataSchema,
  pickStandaloneVideoFile,
  videoRuntimeSeconds,
} from "@/lib/api/internet-archive";

/**
 * Fixtures are the LIVE metadata responses recorded during license
 * verification (prisma/seed.ts, 2026-10-22) — trimmed to metadata + files.
 */
const FIXTURE_DIR = "test/fixtures";

function load(name: string) {
  const raw = JSON.parse(readFileSync(`${FIXTURE_DIR}/${name}`, "utf8"));
  return archiveMetadataSchema.parse(raw);
}

describe("archiveMetadataSchema", () => {
  it("accepts the seven verified item payloads as recorded", () => {
    for (const name of [
      "archive-metadata-ATripToTheMoonGeorgeMelies.json",
      "archive-metadata-Nosferatu_DVD_quality.json",
      "archive-metadata-Night.Of.The.Living.Dead_1080p.json",
      "archive-metadata-CarnivalofSouls.json",
      "archive-metadata-Detour.json",
      "archive-metadata-doa_ipod.json",
      "archive-metadata-BigBuckBunny_124.json",
    ]) {
      const payload = load(name);
      expect(payload.metadata.mediatype).toBe("movies");
      expect(payload.files.length).toBeGreaterThan(0);
    }
  });

  it("keeps the machine-readable license where the item declares one", () => {
    const bunny = load("archive-metadata-BigBuckBunny_124.json");
    expect(bunny.metadata.licenseurl).toContain("licenses/by/3.0");

    const nold = load("archive-metadata-Night.Of.The.Living.Dead_1080p.json");
    expect(nold.metadata.licenseurl).toContain("publicdomain");
    expect(nold.metadata.rights).toMatch(/public/i);
  });

  it("rejects payloads without metadata or files", () => {
    expect(archiveMetadataSchema.safeParse({}).success).toBe(false);
    expect(archiveMetadataSchema.safeParse({ files: [] }).success).toBe(false);
  });
});

describe("pickStandaloneVideoFile", () => {
  it("picks the largest browser-playable .mp4", () => {
    const detour = load("archive-metadata-Detour.json");
    expect(pickStandaloneVideoFile(detour.files)).toBe("Detour.mp4");
  });

  it("can pick files inside subdirectories", () => {
    const bunny = load("archive-metadata-BigBuckBunny_124.json");
    expect(pickStandaloneVideoFile(bunny.files)).toBe(
      "Content/big_buck_bunny_720p_surround.mp4",
    );
  });

  it("returns undefined for split (multi-part) items", () => {
    const nosferatu = load("archive-metadata-Nosferatu_DVD_quality.json");
    const partFiles = nosferatu.files.filter(
      (file) =>
        /\.mp4$/i.test(file.name ?? "") && /\d+of\d+/.test(file.name ?? ""),
    );
    expect(partFiles.length).toBeGreaterThanOrEqual(5);
    expect(pickStandaloneVideoFile(nosferatu.files)).toBeUndefined();
  });

  it("ignores heavy non-mp4 masters like the h.264 .m2ts", () => {
    const nold = load("archive-metadata-Night.Of.The.Living.Dead_1080p.json");
    const picked = pickStandaloneVideoFile(nold.files);
    expect(picked).toBeDefined();
    expect(picked).toMatch(/\.mp4$/);
    expect(picked).not.toMatch(/\.m2ts$/);
  });

  it("returns undefined when nothing exists", () => {
    expect(pickStandaloneVideoFile([])).toBeUndefined();
  });
});

describe("videoRuntimeSeconds", () => {
  it("rounds the longest known length for single-file items", () => {
    const detour = load("archive-metadata-Detour.json");
    expect(videoRuntimeSeconds(detour.files)).toBe(4058);
  });

  it("sums the parts of split items instead of taking one part", () => {
    const nosferatu = load("archive-metadata-Nosferatu_DVD_quality.json");
    // 5 parts x ~1190 s ~ the 93-minute complete version.
    const runtime = videoRuntimeSeconds(nosferatu.files);
    expect(runtime).toBeGreaterThan(5000);
    expect(runtime).toBeLessThan(6000);
  });

  it("is honest about unknown runtimes", () => {
    expect(videoRuntimeSeconds([{ name: "film.mp4" }])).toBeUndefined();
    expect(videoRuntimeSeconds([])).toBeUndefined();
  });
});
