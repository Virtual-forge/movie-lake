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

  const kindTabs = page.getByRole("list", {
    name: "Filter results by kind",
  });
  await kindTabs.getByRole("link", { name: "Series" }).click();
  await expect(page).toHaveURL(/kind=tv/);
  await expect(
    page.getByRole("heading", { name: "Series", exact: true }),
  ).toBeVisible();
  await expect(page.locator('a[href^="/movie/"]')).toHaveCount(0);
});

test("search landing browses content without typing (M8)", async ({ page }) => {
  await page.goto("/search?kind=movie");
  await expect(
    page.getByText("Browse films & series", { exact: true }),
  ).toBeVisible({ timeout: 15_000 });
  // Real content, not the old forever-pending skeleton void.
  await expect(page.locator('a[href^="/movie/"]').first()).toBeVisible({ timeout: 15_000 });
});

test("header Movies/Series links keep the UI in sync with the URL (M8)", async ({
  page,
}) => {
  await page.goto("/search?kind=movie");
  // Browse content is client-fetched: waiting for it means hydration is
  // complete, so the header click cannot fall into the dead-click window.
  await expect(page.locator('a[href^="/movie/"]').first()).toBeVisible({ timeout: 15_000 });

  await page
    .getByRole("banner")
    .getByRole("link", { name: "Series", exact: true })
    .click();
  await expect(page).toHaveURL(/kind=tv/);
  // The old bug: the client kept its first kind while the URL said otherwise.
  await expect(page.locator('a[href^="/movie/"]')).toHaveCount(0);
  await expect(page.locator('a[href^="/tv/"]').first()).toBeVisible({ timeout: 15_000 });
});

test("mobile menu exposes page navigation (M8)", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  const menuButton = page.getByRole("button", { name: "Open menu" });
  await expect(menuButton).toBeVisible();
  await menuButton.click();

  const advanced = page.getByRole("link", { name: "Advanced", exact: true });
  await expect(advanced).toBeVisible();
  await advanced.click();
  await expect(page).toHaveURL(/\/search\/advanced/);
  // The button persists (it is the toggle); the open panel must not.
  await expect(page.getByRole("button", { name: "Close menu" })).toHaveCount(0);
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

test("poster rails drag with the mouse and swallow the follow-up click (M9)", async ({
  page,
}) => {
  await page.goto("/");
  // A poster rail (not the genre-chip row, which holds no card links).
  const rail = page
    .locator("section ul.cursor-grab")
    .filter({ has: page.locator('a[href^="/movie/"]') })
    .first();
  const card = rail.locator('a[href^="/movie/"]').first();
  await expect(card).toBeVisible({ timeout: 15_000 });

  // Bring the card into the viewport: default 1280x720 view clips cards
  // near the page bottom, and a cursor parked on clipped space hits
  // nothing (elementFromPoint is null there).
  await card.scrollIntoViewIfNeeded();
  const box = await card.boundingBox();
  if (!box) throw new Error("poster card did not render");
  const startX = box.x + box.width / 2 + 40;
  const y = box.y + 60;

  await page.mouse.move(startX, y);
  await page.mouse.down();
  // Real-timed CDP moves: pointer capture (engaged on pointerdown) keeps
  // delivering them to the rail while the cursor wanders.
  for (let i = 1; i <= 6; i += 1) {
    await page.mouse.move(startX - i * 60, y);
  }
  await page.mouse.up();

  const scrollLeft = await rail.evaluate((el) => Math.round(el.scrollLeft));
  expect(scrollLeft).toBeGreaterThan(100);

  // The click that follows a real drag must not open the card. Dispatched
  // directly (a fresh locator click would start a new press and clear the
  // suppression state first).
  await card.evaluate((el) => (el as HTMLAnchorElement).click());
  await expect(page).toHaveURL(/\/$/);
});
