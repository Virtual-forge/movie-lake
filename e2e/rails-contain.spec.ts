import { expect, test } from "@playwright/test";

/**
 * M10 phone report: while rails streamed in, the DOCUMENT's horizontal
 * scrollable area transiently grew to the rail width — the page became
 * sideways-scrollable on a phone and Chrome's pinch-out-to-fit then
 * rendered the site desktop-wide and cropped (also the footer-void root
 * cause). The fix is paint containment on every rail scroller
 * (contain-paint in poster-rail/cast-rail/season-list/genre-row). These
 * tests load the two rail-heavy routes in real 390px metrics and assert:
 * the document never widens past the viewport, and a programmatic pan
 * cannot move it sideways.
 */
const ROUTES = ["/", "/movie/693134"];

if (!process.env.BASE_URL) process.env.BASE_URL = "http://localhost:3000";

for (const route of ROUTES) {
  test(`page never scrolls sideways while rails stream (${route})`, async ({
    page,
  }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(route, { waitUntil: "domcontentloaded", timeout: 30000 });
    await page.waitForTimeout(2000); // let every rail stream + animate in

    const out = await page.evaluate(async () => {
      const doc = document.documentElement;
      const scrollW = doc.scrollWidth;
      window.scrollTo(900, 0);
      await new Promise((r) => setTimeout(r, 120));
      return { scrollW, panX: Math.round(window.scrollX), vw: window.innerWidth };
    });

    expect(out.scrollW).toBeLessThanOrEqual(out.vw);
    expect(out.panX).toBe(0);
  });
}
