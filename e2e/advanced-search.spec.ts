import { expect, test } from "@playwright/test";

/**
 * M5 advanced search (PROJECT_PLAN "Advanced Search"): URL-param filters over
 * TMDB discover, keyword switch to source-ranked search plus the capability
 * banner. Filters are broad enough that populated results are stable
 * expectations; exact titles are not asserted (live-data drift tolerated).
 */
const ADVANCED = "/search/advanced";

test("renders the filter form and default two-kind results", async ({
  page,
}) => {
  await page.goto(ADVANCED);
  const main = page.getByRole("main");
  const form = main.locator("form");

  await expect(form).toBeVisible({ timeout: 15_000 });
  await expect(form.getByLabel("Keyword")).toBeVisible();
  await expect(form.getByLabel("Sort results by")).toHaveValue("popularity");
  // Default type selection: both kinds checked.
  await expect(form.locator('input[name="types"][value="movie"]')).toBeChecked();
  await expect(form.locator('input[name="types"][value="tv"]')).toBeChecked();

  await expect(
    main.getByRole("region", { name: "Film results" }).locator("img").first(),
  ).toBeVisible();
  await expect(
    main.getByRole("region", { name: "Series results" }),
  ).toBeVisible();
  // The bare URL is the canonical no-filter state (page param omitted).
  await expect(page).toHaveURL(/\/search\/advanced$/);
});

test("URL filters drive discover results and are reflected back in the form", async ({
  page,
}) => {
  await page.goto(
    `${ADVANCED}?genres=action&yearFrom=1980&yearTo=1999&ratingMin=7&sortBy=rating`,
  );
  const main = page.getByRole("main");
  const form = main.locator("form");

  await expect(
    main.getByRole("region", { name: "Film results" }).locator("img").first(),
  ).toBeVisible({ timeout: 15_000 });

  await expect(form.getByLabel("Sort results by")).toHaveValue("rating");
  await expect(form.locator('input[name="genres"][value="action"]')).toBeChecked();
  await expect(form.locator('input[name="yearFrom"]')).toHaveValue("1980");
  await expect(form.locator('input[name="ratingMin"]')).toHaveValue("7");

  // No keyword, no degradation banner.
  await expect(main.getByRole("note")).toHaveCount(0);

  // Pagination rides on top of the filter set.
  await main.getByRole("link", { name: "Next page" }).click();
  await expect(page).toHaveURL(/page=2/);
  await expect(page).toHaveURL(/sortBy=rating/);
  await expect(page).toHaveURL(/yearFrom=1980/);
});

test("types param narrows results to the selected kind", async ({ page }) => {
  await page.goto(`${ADVANCED}?types=movie`);
  const main = page.getByRole("main");

  await expect(
    main.getByRole("region", { name: "Film results" }).locator("img").first(),
  ).toBeVisible({ timeout: 15_000 });
  await expect(
    main.getByRole("region", { name: "Series results" }),
  ).toHaveCount(0);
});

test("keyword submit switches ranking and shows the capability banner", async ({
  page,
}) => {
  await page.goto(ADVANCED);
  const main = page.getByRole("main");
  const form = main.locator("form");

  await expect(form).toBeVisible({ timeout: 15_000 });
  await form.getByLabel("Keyword").fill("matrix");
  await form.getByText("Action", { exact: true }).click();
  await form.getByRole("button", { name: "Apply filters" }).click();

  // The form round-trips everything: keyword plus the untouched filters.
  await expect(page).toHaveURL(/query=matrix/);
  await expect(page).toHaveURL(/genres=action/);

  // Honest capabilities: source-ranked keyword, filters laid aside, UI says so.
  await expect(main.getByRole("note")).toContainText("ranked by TMDB");
  await expect(
    main.getByRole("region", { name: "Film results" }).locator("img").first(),
  ).toBeVisible({ timeout: 15_000 });
  await expect(
    main.getByRole("region", { name: "Series results" }),
  ).toBeVisible();
});
