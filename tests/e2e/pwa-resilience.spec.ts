import { expect, test } from "@playwright/test";

const PROFILE = {
  name: "Offline Resilience User",
  dateOfBirth: "1990-04-12",
  pin: "2468",
} as const;

async function enterSetupPin(
  page: import("@playwright/test").Page,
  label: "Choose PIN" | "Confirm PIN",
  pin: string,
): Promise<void> {
  for (const [index, digit] of [...pin].entries())
    await page.getByLabel(`${label} digit ${index + 1}`).fill(digit);
}

async function enterUnlockPin(
  page: import("@playwright/test").Page,
  pin: string,
): Promise<void> {
  for (const digit of pin)
    await page.getByRole("button", { name: `Enter ${digit}` }).click();
}

async function createLocalProfile(
  page: import("@playwright/test").Page,
): Promise<void> {
  await page.getByRole("button", { name: "Get started" }).click();
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Accept and continue" }).click();
  await enterSetupPin(page, "Choose PIN", PROFILE.pin);
  await enterSetupPin(page, "Confirm PIN", PROFILE.pin);
  await page.getByLabel("Full name").fill(PROFILE.name);
  await page.getByLabel("Date of birth").fill(PROFILE.dateOfBirth);
  await page.getByLabel("Immigration role").selectOption("main-applicant");
  await page.getByRole("button", { name: "Create household member" }).click();
}

async function waitForControlledServiceWorker(
  page: import("@playwright/test").Page,
): Promise<void> {
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller)
      await new Promise<void>((resolve) => {
        navigator.serviceWorker.addEventListener(
          "controllerchange",
          () => resolve(),
          { once: true },
        );
        window.location.reload();
      });
  });
  await page.waitForLoadState("domcontentloaded");
  await expect
    .poll(() =>
      page.evaluate(() => Boolean(navigator.serviceWorker.controller)),
    )
    .toBe(true);
}

test("launches and navigates with encrypted local data while offline", async ({
  context,
  page,
}) => {
  await page.goto("/");
  await createLocalProfile(page);
  await waitForControlledServiceWorker(page);

  await context.setOffline(true);
  await page.reload();
  await page.waitForLoadState("domcontentloaded");

  await expect(
    page.getByRole("heading", { name: "Enter Security PIN" }),
  ).toBeVisible();
  await enterUnlockPin(page, PROFILE.pin);

  await expect(
    page.getByRole("link", { name: "ILR", exact: true }).first(),
  ).toHaveAttribute("aria-current", "page");
  await page.getByRole("link", { name: "Family", exact: true }).first().click();
  await expect(
    page.getByRole("button", { name: `Edit ${PROFILE.name}` }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Vault", exact: true }).first().click();
  await expect(
    page.getByRole("heading", { name: "Evidence readiness", exact: true }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Install and updates" }).click();
  await expect(page.getByText("Latest", { exact: true })).toBeVisible();
  await expect(
    page.getByText("Could not check for updates. You can retry safely."),
  ).toBeVisible();

  await context.setOffline(false);
  await page.evaluate(() => window.dispatchEvent(new Event("online")));
  await expect(page.getByText("All up to date")).toBeVisible();
});

test("activates a service-worker update, removes stale caches, and preserves IndexedDB", async ({
  page,
}) => {
  await page.goto("/");
  await createLocalProfile(page);
  await waitForControlledServiceWorker(page);

  const before = await page.evaluate(async () => {
    await caches
      .open("urbanfox-shell-stale-test")
      .then((cache) =>
        cache.put(
          new Request("./stale-test"),
          new Response("stale", { status: 200 }),
        ),
      );
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("urbanfox-ilr", 8);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const encryptedProfile = await new Promise<unknown>((resolve, reject) => {
      const request = database
        .transaction("profiles", "readonly")
        .objectStore("profiles")
        .get("household-members");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    database.close();
    return {
      cacheKeys: await caches.keys(),
      encryptedProfile: JSON.stringify(encryptedProfile),
    };
  });

  expect(before.cacheKeys).toContain("urbanfox-shell-stale-test");
  expect(before.encryptedProfile).toContain("ciphertext");
  expect(before.encryptedProfile).not.toContain(PROFILE.name);

  await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.ready;
    await registration.unregister();
    const updated = await navigator.serviceWorker.register(
      `./service-worker.js?test-update=${Date.now()}`,
      { scope: "./" },
    );
    await new Promise<void>((resolve, reject) => {
      const worker = updated.installing ?? updated.waiting ?? updated.active;
      if (!worker) {
        reject(new Error("Updated service worker was not created."));
        return;
      }
      if (worker.state === "activated") {
        resolve();
        return;
      }
      worker.addEventListener("statechange", () => {
        if (worker.state === "activated") resolve();
        if (worker.state === "redundant")
          reject(new Error("Updated service worker became redundant."));
      });
    });
  });

  await expect
    .poll(() =>
      page.evaluate(
        async () =>
          !(await caches.keys()).includes("urbanfox-shell-stale-test"),
      ),
    )
    .toBe(true);

  const after = await page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("urbanfox-ilr", 8);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const encryptedProfile = await new Promise<unknown>((resolve, reject) => {
      const request = database
        .transaction("profiles", "readonly")
        .objectStore("profiles")
        .get("household-members");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    database.close();
    return {
      cacheKeys: await caches.keys(),
      encryptedProfile: JSON.stringify(encryptedProfile),
    };
  });

  expect(after.cacheKeys.some((key) => key.startsWith("urbanfox-shell-"))).toBe(
    true,
  );
  expect(after.encryptedProfile).toBe(before.encryptedProfile);

  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Enter Security PIN" }),
  ).toBeVisible();
  await enterUnlockPin(page, PROFILE.pin);
  await page.getByRole("link", { name: "Family", exact: true }).first().click();
  await expect(
    page.getByRole("button", { name: `Edit ${PROFILE.name}` }),
  ).toBeVisible();
});
