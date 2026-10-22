import { expect, test } from "@playwright/test";

/**
 * M1 smoke path (PROJECT_PLAN): home -> search -> TMDB detail.
 * Loose selectors on purpose: daily trending data changes.
 */

test("homepage renders live rails and navigates to a TMDB detail page", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { name: "Popular series" })).toBeVisible();

  const firstFilmCard = page.locator('a[href^="/movie/"].group').first();
  await expect(firstFilmCard).toBeVisible();
  await firstFilmCard.click();

  await expect(page).toHaveURL(/\/movie\/\d+$/);
  // Scope to main: Next's route announcer copies the previous page's h1 into
  // an offline alert node, so a bare locator("h1") double-matches here.
  const heading = page.getByRole("main").getByRole("heading", { level: 1 });
  await expect(heading).toBeVisible();
  await expect(heading).not.toHaveText("");
  await expect(page.getByRole("button", { name: /favorites/i })).toBeVisible();
});

test("search refines with debounce and kind tabs filter results", async ({
  page,
}) => {
  await page.goto("/search");
  const input = page.getByLabel("Search films and series");
  await input.fill("star wars");

  await expect(
    page.getByRole("heading", { name: "Films", exact: true }),
  ).toBeVisible({ timeout: 15_000 });
  await expect(page.locator('a[href^="/movie/"]').first()).toBeVisible();

  await page.getByRole("tab", { name: "Series" }).click();
  await expect(page).toHaveURL(/kind=tv/);
  await expect(
    page.getByRole("heading", { name: "Series", exact: true }),
  ).toBeVisible();
  await expect(page.locator('a[href^="/movie/"]')).toHaveCount(0);
});

test("genre pages are TMDB-backed and link onward", async ({ page }) => {
  await page.goto("/genres/comedy");
  await expect(page.locator("h1")).toHaveText("Comedy");
  await expect(page.getByRole("heading", { name: "Films", exact: true })).toBeVisible();
  await expect(page.locator('a[href^="/movie/"]').first()).toBeVisible();

  // Combined view also surfaces series (comedy enjoys both).
  await expect(page.getByRole("heading", { name: "Series", exact: true })).toBeVisible();
  await expect(page.locator('a[href^="/tv/"]').first()).toBeVisible();
});

test("genre page type tabs switch the view via URL params", async ({ page }) => {
  await page.goto("/genres/comedy");

  const tabs = page.getByRole("navigation", {
    name: "Browse Comedy by type",
  });
  await expect(tabs.getByRole("link", { name: "Films" })).toBeVisible();
  await expect(tabs.getByRole("link", { name: "Series" })).toBeVisible();
  // The default "All" state marks itself as current.
  await expect(tabs.getByRole("link", { name: "All" })).toHaveAttribute(
    "aria-current",
    "true",
  );

  await tabs.getByRole("link", { name: "Series" }).click();
  await expect(page).toHaveURL(/\/genres\/comedy\?kind=tv/);
  await expect(
    page.getByRole("heading", { name: "Series", exact: true }),
  ).toBeVisible();
  await expect(page.locator('a[href^="/movie/"]')).toHaveCount(0);

  await tabs.getByRole("link", { name: "Films" }).click();
  await expect(page).toHaveURL(/\/genres\/comedy\?kind=movie/);
  await expect(
    page.getByRole("heading", { name: "Films", exact: true }),
  ).toBeVisible();
});

test("genre page films paginate through the URL", async ({ page }) => {
  await page.goto("/genres/comedy?kind=movie");

  const pagination = page.getByRole("navigation", {
    name: "Comedy films pagination",
  });
  await expect(pagination).toBeVisible();
  // The first page disables "Prev" and marks itself as current.
  await expect(pagination.getByLabel("Page 1, current page")).toBeVisible();
  await expect(pagination.getByRole("link", { name: "Previous page" })).toHaveCount(0);

  const firstPoster = page.locator('a[href^="/movie/"]').first();
  const firstName = await firstPoster.getAttribute("href");
  await pagination.getByRole("link", { name: "Next page" }).click();

  await expect(page).toHaveURL(/kind=movie&page=2/);
  await expect(pagination.getByRole("link", { name: "Previous page" })).toBeVisible();
  // Page 2 genuinely shows different titles than page 1.
  const secondFirst = await page.locator('a[href^="/movie/"]').first();
  await expect(secondFirst).not.toHaveAttribute("href", firstName ?? "missing");
});
