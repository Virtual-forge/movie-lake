import { expect, test } from "@playwright/test";

/**
 * M3 watch experience (PROJECT_PLAN TMDB slice): embedded trailer dialog and
 * the Where-to-watch panel on detail pages. Uses specific ids with
 * known-verified US provider data (recorded October 2026 into
 * test/fixtures/*-details-{693134,1396}.json); some data drift is tolerated
 * by design since TMDB pulls provider data live.
 */
const DUNE = "/movie/693134";
const BREAKING_BAD = "/tv/1396";

test("movie detail page embeds the trailer in a dismissible dialog", async ({
  page,
}) => {
  await page.goto(DUNE);

  const trigger = page.getByRole("main").getByRole("link", {
    name: /play trailer/i,
  });
  await expect(trigger).toBeVisible({ timeout: 15_000 });
  // Progressive enhancement: the raw href always points at YouTube.
  await expect(trigger).toHaveAttribute("href", /youtube\.com\/watch/);

  await trigger.click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await expect(dialog.locator("iframe")).toHaveAttribute(
    "src",
    /youtube-nocookie\.com\/embed/, // privacy-friendly embed, autoplay on open
  );

  await dialog.getByRole("button", { name: "Close trailer player" }).click();
  await expect(dialog).not.toBeAttached();
});

test("movie detail page shows the US Where-to-watch panel with JustWatch credit", async ({
  page,
}) => {
  await page.goto(DUNE);

  const panel = page.getByRole("main").getByRole("region", {
    name: "Where to watch",
  });
  await expect(panel).toBeVisible({ timeout: 15_000 });
  await expect(panel.getByText("Stream", { exact: true })).toBeVisible();

  // Provider chips carry the provider logo art. next/image proxies srcs,
  // so the original TMDB w92 URL appears URL-encoded in the query string.
  const firstLogo = panel.locator("img[alt$=' logo']").first();
  await expect(firstLogo).toBeVisible();
  await expect(firstLogo).toHaveAttribute("src", /t%2Fp%2Fw92/);

  // TMDB terms: JustWatch credit must accompany provider data.
  await expect(
    panel.getByRole("link", { name: "JustWatch" }).first(),
  ).toBeVisible();

  // "See all offers" deep link opens TMDB's watch page (which credits
  // JustWatch; TMDB's watch/providers link points there by design).
  const allOffers = panel.getByRole("link", { name: /See all offers on TMDB/i });
  if (await allOffers.isVisible()) {
    await expect(allOffers).toHaveAttribute("href", /themoviedb\.org/);
  }
});

test("series detail page renders watch data with missing-rent slice omitted", async ({
  page,
}) => {
  await page.goto(BREAKING_BAD);

  const panel = page.getByRole("main").getByRole("region", {
    name: "Where to watch",
  });
  await expect(panel).toBeVisible({ timeout: 15_000 });
  // Recorded payload (2026-10): Netflix flatrate + buy offers, no US rent.
  await expect(panel.getByText("Netflix", { exact: false }).first()).toBeVisible();
  await expect(panel.getByText("Rent", { exact: true })).toHaveCount(0);
});
