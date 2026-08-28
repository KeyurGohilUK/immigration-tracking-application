import { expect, test } from "@playwright/test";

test("shows the anonymous landing page without tracker controls", async ({
  page,
}) => {
  await page.goto("/");

  await expect(page).toHaveTitle("UrbanFox ILR");
  await expect(
    page.getByRole("heading", { name: "Keep your ILR journey organised." }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "A tracking tool—not legal advice" }),
  ).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "Primary navigation" }),
  ).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Install app" })).toHaveCount(
    0,
  );
  await expect(page.getByRole("button", { name: "Lock app" })).toHaveCount(0);

  const getStartedButton = page.getByRole("button", { name: "Get started" });
  const buttonColours = await getStartedButton.evaluate((button) => {
    const style = window.getComputedStyle(button);
    return {
      background: style.backgroundColor,
      text: style.color,
    };
  });

  expect(buttonColours).toEqual({
    background: "rgb(0, 0, 0)",
    text: "rgb(255, 255, 255)",
  });
});

test("opens local profile setup from the public landing page", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Get started" }).click();

  await expect(
    page.getByRole("heading", { name: "Let’s organise your ILR journey." }),
  ).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "Primary navigation" }),
  ).toBeVisible();
});

test("uses an app layout on mobile", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile-chromium");
  await page.goto("/");
  await page.getByRole("button", { name: "Get started" }).click();

  const navigationBox = await page
    .getByRole("navigation", { name: "Primary navigation" })
    .boundingBox();

  expect(navigationBox).not.toBeNull();
  expect(navigationBox?.y).toBeGreaterThan(600);
  expect(navigationBox?.width).toBeLessThanOrEqual(430);
});

test("uses a wide website layout on desktop", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium");
  await page.goto("/");
  await page.getByRole("button", { name: "Get started" }).click();

  const mainBox = await page.getByRole("main").boundingBox();
  const navigationBox = await page
    .getByRole("navigation", { name: "Primary navigation" })
    .boundingBox();

  expect(mainBox).not.toBeNull();
  expect(navigationBox).not.toBeNull();
  expect(mainBox?.width).toBeGreaterThan(900);
  expect(navigationBox?.y).toBeLessThan(mainBox?.y ?? 0);
  expect(navigationBox?.height).toBeLessThanOrEqual(64);
});

test("registers the offline app service worker", async ({ page }) => {
  await page.goto("/");

  const registrationScope = await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.ready;
    return registration.scope;
  });

  expect(registrationScope).toContain("127.0.0.1:4173");
});
