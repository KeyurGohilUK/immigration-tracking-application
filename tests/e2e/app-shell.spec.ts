import { expect, test } from "@playwright/test";

async function createLocalProfile(
  page: import("@playwright/test").Page,
): Promise<void> {
  await page.getByRole("button", { name: "Get started" }).click();
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Accept and continue" }).click();
  await page.getByLabel("Choose PIN").fill("4826");
  await page.getByLabel("Confirm PIN").fill("4826");
  await page.getByRole("button", { name: "Create private space" }).click();
  await page.getByLabel("Full name").fill("Keyur Gohil");
  await page.getByLabel("Date of birth").fill("1990-01-15");
  await page.getByRole("button", { name: "Save local profile" }).click();
  await expect(
    page.getByRole("heading", { name: "Let’s organise your ILR journey." }),
  ).toBeVisible();
  await expect(page.getByText("Welcome back, Keyur Gohil.")).toBeVisible();
}

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

test("opens PIN setup from the public landing page", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Get started" }).click();

  await expect(
    page.getByRole("heading", { name: "Terms and privacy" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Create your four-digit PIN" }),
  ).toHaveCount(0);
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Accept and continue" }).click();

  await expect(
    page.getByRole("heading", { name: "Create your four-digit PIN" }),
  ).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "Primary navigation" }),
  ).toHaveCount(0);
});

test("makes legal information available without entering setup", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Privacy" }).click();

  await expect(
    page.getByRole("heading", { name: "Privacy and local data" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Back" }).click();
  await expect(page.getByRole("button", { name: "Get started" })).toBeVisible();
});

test("creates, locks, and unlocks a local private space", async ({ page }) => {
  await page.goto("/");
  await createLocalProfile(page);
  const storedProfile = await page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("urbanfox-ilr", 2);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    return new Promise<string>((resolve, reject) => {
      const request = database
        .transaction("profiles", "readonly")
        .objectStore("profiles")
        .get("owner");
      request.onsuccess = () => resolve(JSON.stringify(request.result));
      request.onerror = () => reject(request.error);
    });
  });
  expect(storedProfile).not.toContain("Keyur Gohil");
  expect(storedProfile).toContain("ciphertext");
  await page.getByRole("button", { name: "Lock app" }).click();

  await expect(
    page.getByRole("heading", { name: "Unlock your private space" }),
  ).toBeVisible();
  await page.getByLabel("Four-digit PIN").fill("1111");
  await page.getByRole("button", { name: "Unlock" }).click();
  await expect(page.getByRole("alert")).toContainText("could not unlock");

  await page.getByLabel("Four-digit PIN").fill("4826");
  await page.getByRole("button", { name: "Unlock" }).click();
  await expect(
    page.getByRole("heading", { name: "Let’s organise your ILR journey." }),
  ).toBeVisible();

  await page.reload();
  await page.getByRole("button", { name: "Get started" }).click();
  await expect(
    page.getByRole("heading", { name: "Unlock your private space" }),
  ).toBeVisible();
});

test("uses an app layout on mobile", async ({ page }, testInfo) => {
  test.skip(testInfo.project.name !== "mobile-chromium");
  await page.goto("/");
  await createLocalProfile(page);

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
  await createLocalProfile(page);

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
