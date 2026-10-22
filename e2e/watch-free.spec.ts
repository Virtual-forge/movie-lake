import { expect, test } from "@playwright/test";

/**
 * FreeFilm watch page (PROJECT_PLAN → §5 Watch Page): curated free films
 * embed the Internet Archive player with their license; everything else
 * falls back honestly to the trailer + where-to-watch. Seeded ids were
 * license-verified on 2026-10-22 (prisma/seed.ts); drift tolerance applies
 * to live TMDB/IA data, but the structural claims are stable.
 */
const FREE_MOVIE = "/movie/10331"; // Night of the Living Dead (seeded, PD)
const NON_FREE = "/movie/693134"; // Dune, Part Two (not seeded)
const SERIES = "/tv/1396"; // Breaking Bad (series: no watch page)

test("free film detail shows the Watch button", async ({ page }) => {
  await page.goto(FREE_MOVIE);
  const watch = page
    .getByRole("main")
    .getByRole("link", { name: "Watch", exact: true });
  await expect(watch).toBeVisible({ timeout: 15_000 });
  await expect(watch).toHaveAttribute("href", /\/movie\/10331\/watch$/);
});

test("watch page embeds the verified Internet Archive copy with its license", async ({
  page,
}) => {
  await page.goto(`${FREE_MOVIE}/watch`);
  const main = page.getByRole("main");

  const frame = main.locator("iframe");
  await expect(frame.first()).toBeVisible({ timeout: 15_000 });
  // The official IA embed of the curated identifier.
  await expect(frame.first()).toHaveAttribute(
    "src",
    /archive\.org\/embed\/Night\.Of\.The\.Living\.Dead_1080p/,
  );
  // Sandboxed beyond the site-wide CSP frame-src (plan Security: iframes
  // use sandbox/allow attributes).
  await expect(frame.first()).toHaveAttribute("sandbox", /allow-scripts/);

  await expect(main.getByRole("region", { name: "Full film" })).toBeVisible();
  await expect(main.getByText("Full film — Public domain (US)")).toBeVisible();
  // The curated item's identifier links to its archive.org item page.
  await expect(
    main.getByRole("link", { name: "Night.Of.The.Living.Dead_1080p" }),
  ).toBeVisible();
  await expect(
    main.getByText(/Public-domain status varies by country/),
  ).toBeVisible();
  // The license reference (the Wikipedia PD list row basis) is linked.
  await expect(
    main.getByRole("link", { name: /Public domain \(US\) — reference/ }),
  ).toBeVisible();
});

test("non-free film watch page falls back to trailer and providers", async ({
  page,
}) => {
  await page.goto(`${NON_FREE}/watch`);
  const main = page.getByRole("main");

  await expect(
    main.getByText(/No verified free stream/),
  ).toBeVisible({ timeout: 15_000 });
  await expect(
    main.getByRole("link", { name: /play trailer/i }),
  ).toBeVisible();
  const panel = main.getByRole("region", { name: "Where to watch", exact: true });
  await expect(panel).toBeVisible();
  await expect(panel.getByText("Stream", { exact: true })).toBeVisible();
  // Nothing frames a full-film player for a non-free title.
  await expect(main.locator("iframe")).toHaveCount(0);
});

test("non-free film detail reads the other CTA label", async ({ page }) => {
  await page.goto(NON_FREE);
  const cta = page
    .getByRole("main")
    .getByRole("link", { name: "Trailer & where to watch" });
  await expect(cta).toBeVisible({ timeout: 15_000 });
  await expect(cta).toHaveAttribute("href", /\/movie\/693134\/watch$/);
});

test("series have no watch page and no watch CTA", async ({ page }) => {
  await page.goto(SERIES);
  const main = page.getByRole("main");
  await expect(main.getByRole("heading", { level: 1 })).toBeVisible({
    timeout: 15_000,
  });
  await expect(
    main.getByRole("link", { name: "Watch", exact: true }),
  ).toHaveCount(0);
  await expect(
    main.getByRole("link", { name: "Trailer & where to watch" }),
  ).toHaveCount(0);

  // /tv/[id]/watch does not exist for the MVP.
  const response = await page.goto(`${SERIES}/watch`);
  expect(response?.status()).toBe(404);
});
