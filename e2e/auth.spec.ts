import { expect, test, type Page } from "@playwright/test";

/**
 * M2 auth loop (PROJECT_PLAN): register -> sign in state -> favorite a
 * TMDB title -> see it on /profile -> remove it -> sign out, plus the
 * signed-out /profile -> /login?redirect=%2Fprofile -> back to /profile
 * chain, and an honest error for wrong credentials.
 *
 * Each test registers its OWN account (module-level state is not shared
 * across Playwright tests), and the dev webServer needs the local Postgres
 * up (docker compose up -d).
 */
const NAME = "River Runner";
const PASSWORD = "lake-secret-2026";

function accountMenu(page: Page, name = NAME) {
  return page.getByRole("button", {
    name: new RegExp(`Account menu for ${name}`),
  });
}

async function register(page: Page, email: string) {
  await page.goto("/register");
  await page.getByLabel("Name").fill(NAME);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: /create account/i }).click();
}

async function signOutViaMenu(page: Page) {
  await accountMenu(page).click();
  await page.getByRole("menuitem", { name: "Sign out" }).click();
  await expect(page.getByRole("link", { name: /sign in/i })).toBeVisible({
    timeout: 10_000,
  });
}

test("register, favorite, profile, remove, sign out", async ({ page }) => {
  // Register — Better Auth signs the new user in immediately.
  await register(page, `river.runner.${Date.now()}@e2e.movie-lake.test`);

  // Header swaps from Guest to the signed-in account island.
  await expect(accountMenu(page)).toBeVisible({ timeout: 15_000 });

  // Favorite the first film rail card's detail page.
  await page.goto("/");
  const firstFilmCard = page.locator('a[href^="/movie/"].group').first();
  await expect(firstFilmCard).toBeVisible();
  await firstFilmCard.click();
  await expect(page).toHaveURL(/\/movie\/\d+$/);

  const favoriteButton = page.getByRole("button", { name: /add .+ to favorites/i });
  await expect(favoriteButton).toBeVisible();
  await favoriteButton.click();
  await expect(
    page.getByRole("button", { name: /remove .+ from favorites/i }),
  ).toBeVisible({ timeout: 10_000 });

  // Open the account menu and jump to the favorites page.
  await accountMenu(page).click();
  await page.getByRole("menuitem", { name: "Your favorites" }).click();
  await expect(page).toHaveURL(/\/profile/);
  const profileMain = page.getByRole("main");
  await expect(
    profileMain.getByRole("heading", { level: 1, name: "Your favorites" }),
  ).toBeVisible({ timeout: 15_000 });

  // The favorite must be there, and removing it empties the list.
  await expect(
    profileMain.getByRole("link", { name: /.+ poster/ }).first(),
  ).toBeVisible();
  const removeButton = profileMain.getByRole("button", {
    name: /remove .+ from favorites/i,
  });
  await expect(removeButton).toBeVisible();
  await removeButton.click();
  await expect(
    profileMain.getByText("No favorites yet."),
  ).toBeVisible({ timeout: 10_000 });

  // Sign out from the same menu.
  await signOutViaMenu(page);
});

test("signed-out /profile redirects to login and returns after sign-in", async ({
  page,
}) => {
  // Self-contained: register, sign out, then follow the redirect chain back.
  const email = `river.relogin.${Date.now()}@e2e.movie-lake.test`;
  await register(page, email);
  await expect(accountMenu(page)).toBeVisible({ timeout: 15_000 });
  await signOutViaMenu(page);

  await page.goto("/profile");
  await expect(page).toHaveURL(/\/login\?redirect=%2Fprofile/);

  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: /sign in/i }).click();

  await expect(page).toHaveURL(/\/profile/, { timeout: 15_000 });
  await expect(
    page.getByRole("main").getByRole("heading", { level: 1, name: "Your favorites" }),
  ).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole("main").getByText("No favorites yet.")).toBeVisible();
});

test("invalid login shows an honest error", async ({ page }) => {
  await page.goto("/login");
  await page.getByLabel("Email").fill("nobody@example.dev");
  await page.getByLabel("Password", { exact: true }).fill("wrong-password-1");
  await page.getByRole("button", { name: /sign in/i }).click();
  await expect(page.getByRole("alert")).toBeVisible({ timeout: 10_000 });
});
