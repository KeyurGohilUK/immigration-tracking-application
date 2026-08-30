import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";

const TEST_PROFILE = {
  name: "Urban Fox Test User",
  dateOfBirth: "2000-01-01",
  pin: "2468",
} as const;

async function createLocalProfile(
  page: import("@playwright/test").Page,
): Promise<void> {
  await page.getByRole("button", { name: "Get started" }).click();
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Accept and continue" }).click();
  await enterPin(page, "Choose PIN", TEST_PROFILE.pin);
  await enterPin(page, "Confirm PIN", TEST_PROFILE.pin);
  await page.getByLabel("Full name").fill(TEST_PROFILE.name);
  await page.getByLabel("Date of birth").fill(TEST_PROFILE.dateOfBirth);
  await page.getByRole("button", { name: "Save local profile" }).click();
  await expect(
    page.getByRole("heading", { name: "Let’s organise your ILR journey." }),
  ).toBeVisible();
  await expect(
    page.getByText(`Welcome back, ${TEST_PROFILE.name}.`),
  ).toBeVisible();
}

async function enterPin(
  page: import("@playwright/test").Page,
  label: string,
  pin: string,
): Promise<void> {
  for (const [index, digit] of [...pin].entries()) {
    await page.getByLabel(`${label} digit ${index + 1}`).fill(digit);
  }
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

test("shows install and update controls in every device header", async ({
  page,
}) => {
  await page.goto("/");

  const trigger = page.getByRole("button", { name: "Install and updates" });
  await expect(trigger).toBeVisible();
  const triggerBox = await trigger.boundingBox();
  const headerBox = await page.getByRole("banner").boundingBox();
  expect(triggerBox).not.toBeNull();
  expect(headerBox).not.toBeNull();
  expect(triggerBox?.y).toBeGreaterThanOrEqual(headerBox?.y ?? 0);
  expect((triggerBox?.y ?? 0) + (triggerBox?.height ?? 0)).toBeLessThanOrEqual(
    (headerBox?.y ?? 0) + (headerBox?.height ?? 0),
  );
  await trigger.click();
  await expect(
    page.getByRole("dialog", { name: "Install and updates" }),
  ).toBeVisible();
  await expect(page.getByText("Installed")).toBeVisible();
  await expect(page.getByText("Latest")).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Download updates" }),
  ).toBeVisible();
  await expect(
    page.getByText(
      "Validated every owner, family, permission, and trip record",
    ),
  ).toBeVisible();
  await expect(
    page.getByText("Added a protected forgotten-PIN reset", { exact: false }),
  ).toHaveCount(0);
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
  await expect(
    page.getByRole("button", { name: "Reset local data" }),
  ).toHaveCount(0);
});

test("keeps the legal action inside the desktop viewport", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium");
  await page.goto("/");
  await page.getByRole("button", { name: "Get started" }).click();

  const actionBox = await page
    .getByRole("button", { name: "Accept and continue" })
    .boundingBox();
  const viewportHeight = await page.evaluate(() => window.innerHeight);

  expect(actionBox).not.toBeNull();
  expect(actionBox?.y).toBeGreaterThanOrEqual(0);
  expect((actionBox?.y ?? 0) + (actionBox?.height ?? 0)).toBeLessThanOrEqual(
    viewportHeight,
  );
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
      const request = indexedDB.open("urbanfox-ilr", 4);
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
  expect(storedProfile).not.toContain(TEST_PROFILE.name);
  expect(storedProfile).toContain("ciphertext");
  await page.getByRole("button", { name: "Lock app" }).click();

  await expect(
    page.getByRole("heading", { name: "Unlock your private space" }),
  ).toBeVisible();
  await enterPin(page, "Four-digit PIN", "1111");
  await expect(page.getByRole("alert")).toContainText("could not unlock");

  await enterPin(page, "Four-digit PIN", TEST_PROFILE.pin);
  await expect(
    page.getByRole("heading", { name: "Let’s organise your ILR journey." }),
  ).toBeVisible();

  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Unlock your private space" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Get started" })).toHaveCount(
    0,
  );
  await expect(page.locator(".pin-digit")).toHaveCount(4);
});

test("resets local data safely when the PIN is forgotten", async ({ page }) => {
  await page.goto("/");
  await createLocalProfile(page);
  await page.getByRole("button", { name: "Lock app" }).click();

  await expect(
    page.getByRole("heading", { name: "Forgot your PIN?" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Reset local data" }).click();
  await expect(
    page.getByRole("heading", { name: "Reset this private space?" }),
  ).toBeVisible();
  await expect(page.locator("#delete-data-form .danger-warning")).toContainText(
    "This cannot be undone",
  );

  await page.getByLabel("Type DELETE to confirm").fill("RESET");
  await page.getByRole("button", { name: "Delete data and reset PIN" }).click();
  await expect(page.getByRole("alert")).toContainText("Type DELETE exactly");

  await page.getByLabel("Type DELETE to confirm").fill("DELETE");
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Delete data and reset PIN" }).click();
  await expect(page.locator("#landing-status")).toContainText(
    "previous local data and PIN were deleted",
  );
  await expect(page.getByRole("button", { name: "Get started" })).toBeVisible();

  await page.reload();
  await expect(page.getByRole("button", { name: "Get started" })).toBeVisible();
  await page.getByRole("button", { name: "Get started" }).click();
  await expect(
    page.getByRole("heading", { name: "Terms and privacy" }),
  ).toBeVisible();
});

test("exports and restores an encrypted backup from More", async ({ page }) => {
  await page.goto("/");
  await createLocalProfile(page);

  await expect(
    page.getByText("On this device", { exact: true }),
  ).toBeAttached();
  await page.getByRole("link", { name: "More", exact: true }).click();

  await expect(page.getByRole("heading", { name: "More" })).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Stored only on this device" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Create encrypted backup" }).click();
  await page.getByLabel("Backup password", { exact: true }).fill("too-short");
  await page.getByLabel("Confirm backup password").fill("too-short");
  await page.getByRole("button", { name: "Download encrypted backup" }).click();
  await expect(page.getByRole("alert")).toContainText("at least 12");

  const backupPassword = "a-secure-test-backup-password";
  await page
    .getByLabel("Backup password", { exact: true })
    .fill(backupPassword);
  await page.getByLabel("Confirm backup password").fill(backupPassword);
  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download encrypted backup" }).click();
  const download = await downloadPromise;
  const downloadPath = await download.path();
  expect(download.suggestedFilename()).toMatch(
    /^urbanfox-ilr-backup-\d{4}-\d{2}-\d{2}\.json$/,
  );
  expect(downloadPath).not.toBeNull();
  if (!downloadPath) throw new Error("Backup download path was unavailable.");
  const backupText = await readFile(downloadPath, "utf8");
  const backup = JSON.parse(backupText) as Record<string, unknown>;
  expect(backup.format).toBe("urbanfox-ilr-encrypted-backup");
  expect(backup.version).toBe(1);
  expect(backup.dataSchemaVersion).toBe(4);
  expect(backupText).not.toContain(TEST_PROFILE.name);
  await expect(
    page.getByText("Encrypted backup downloaded", { exact: false }),
  ).toBeVisible();

  await page.getByRole("link", { name: "Family", exact: true }).click();
  await page.getByRole("button", { name: "Add family member" }).click();
  await page.getByLabel("Full name").fill("Temporary Family Member");
  await page.getByLabel("Date of birth").fill("2005-06-15");
  await page
    .getByLabel("Relationship to household owner")
    .selectOption("other");
  await page.getByLabel("Immigration role").selectOption("not-set");
  await page.getByRole("button", { name: "Save family member" }).click();
  await expect(
    page.getByRole("heading", { name: "Temporary Family Member", exact: true }),
  ).toBeVisible();

  await page.getByRole("link", { name: "More", exact: true }).click();
  await page.getByRole("button", { name: "Restore encrypted backup" }).click();
  await page.getByLabel("Encrypted backup file").setInputFiles({
    name: "urbanfox-ilr-backup.json",
    mimeType: "application/json",
    buffer: Buffer.from(backupText),
  });
  await page.getByLabel("Restore backup password").fill(backupPassword);
  await page.getByRole("button", { name: "Review backup" }).click();
  const restoreSummaryHeading = page.getByRole("heading", {
    name: "Review before replacing data",
  });
  await expect
    .poll(
      async () => {
        if (await restoreSummaryHeading.isVisible()) return "ready";
        const restoreError = await page
          .locator("#restore-form-error")
          .textContent();
        return restoreError?.trim() || "validating";
      },
      {
        message: "Backup validation should show its review summary",
        timeout: 20_000,
      },
    )
    .toBe("ready");
  await expect(page.getByText(`Household: ${TEST_PROFILE.name}`)).toBeVisible();
  await expect(page.locator("#restore-people")).toHaveText("1");
  await expect(page.locator("#restore-permissions")).toHaveText("0");
  await expect(page.locator("#restore-trips")).toHaveText("0");
  await page
    .getByLabel("I understand this replaces my current local records")
    .check();
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Replace local data" }).click();
  await expect(
    page.getByText("Backup restored successfully", { exact: false }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Family", exact: true }).click();
  await expect(page.getByText("No family members added yet")).toBeVisible();
  await page.getByRole("link", { name: "More", exact: true }).click();

  await page.getByRole("button", { name: "View legal information" }).click();
  await expect(
    page.getByRole("heading", { name: "Terms and privacy" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Back" }).click();
  await expect(page.getByRole("heading", { name: "More" })).toBeVisible();

  await page.getByRole("button", { name: "Lock now" }).click();
  await expect(
    page.getByRole("heading", { name: "Unlock your private space" }),
  ).toBeVisible();
});

test("permanently deletes all local application data", async ({ page }) => {
  await page.goto("/");
  await createLocalProfile(page);
  await page.getByRole("link", { name: "More", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Delete all local data" }),
  ).toBeVisible();
  const openDeleteButton = page.getByRole("button", {
    name: "Delete all local data",
  });
  const dangerColours = await openDeleteButton.evaluate((button) => {
    const style = window.getComputedStyle(button);
    return { background: style.backgroundColor, text: style.color };
  });
  expect(dangerColours).toEqual({
    background: "rgb(154, 52, 31)",
    text: "rgb(255, 255, 255)",
  });
  await expect(page.locator(".danger-zone .danger-warning")).toContainText(
    "This cannot be undone",
  );
  await openDeleteButton.click();

  await expect(
    page.getByRole("heading", { name: "Delete everything on this device?" }),
  ).toBeVisible();
  await expect(page.locator("#delete-data-form .danger-warning")).toContainText(
    "This cannot be undone",
  );
  await expect(
    page.getByRole("button", { name: "Permanently delete local data" }),
  ).toHaveCSS("background-color", "rgb(154, 52, 31)");
  await page.getByLabel("Type DELETE to confirm").fill("delete");
  await page
    .getByRole("button", { name: "Permanently delete local data" })
    .click();
  await expect(page.getByRole("alert")).toContainText("Type DELETE exactly");

  await page.getByLabel("Type DELETE to confirm").fill("DELETE");
  page.once("dialog", (dialog) => dialog.accept());
  await page
    .getByRole("button", { name: "Permanently delete local data" })
    .click();
  await expect(page.locator("#landing-status")).toContainText(
    "All UrbanFox ILR data and the local PIN were deleted",
  );
  await expect(page.getByRole("button", { name: "Get started" })).toBeVisible();

  const localData = await page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("urbanfox-ilr", 4);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const storeNames = ["security", "profiles", "permissions", "trips"];
    const transaction = database.transaction(storeNames, "readonly");
    const counts = await Promise.all(
      storeNames.map(
        (storeName) =>
          new Promise<number>((resolve, reject) => {
            const request = transaction.objectStore(storeName).count();
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
          }),
      ),
    );
    database.close();
    return {
      counts,
      termsAcceptance: localStorage.getItem("urbanfox-ilr:terms-acceptance"),
    };
  });
  expect(localData).toEqual({ counts: [0, 0, 0, 0], termsAcceptance: null });

  await page.reload();
  await expect(page.getByRole("button", { name: "Get started" })).toBeVisible();
  await page.getByRole("button", { name: "Get started" }).click();
  await expect(
    page.getByRole("heading", { name: "Terms and privacy" }),
  ).toBeVisible();
});

test("adds, edits, persists, and deletes an encrypted family member", async ({
  page,
}) => {
  await page.goto("/");
  await createLocalProfile(page);
  await page.getByRole("link", { name: "Family" }).click();

  await expect(
    page.getByRole("heading", { name: "Your family" }),
  ).toBeVisible();
  await expect(page.getByText("No family members added yet")).toBeVisible();
  await page.getByRole("button", { name: "Add family member" }).click();
  await page.getByLabel("Full name").fill("Freddy Test Dependant");
  await page.getByLabel("Date of birth").fill("2005-06-15");
  await page
    .getByLabel("Relationship to household owner")
    .selectOption("child");
  await page.getByLabel("Immigration role").selectOption("dependant");
  await page.getByRole("button", { name: "Save family member" }).click();

  await expect(
    page.getByRole("heading", { name: "Freddy Test Dependant", level: 3 }),
  ).toBeVisible();
  await expect(page.getByLabel("Tracking profile")).toHaveValue(/.+/);
  await expect(page.locator("#selected-person-name")).toHaveText(
    "Freddy Test Dependant",
  );

  await page.getByRole("link", { name: "Home", exact: true }).click();
  await expect(page.locator("#selected-person-name")).toHaveText(
    "Freddy Test Dependant",
  );
  await page.getByLabel("Tracking profile").selectOption("owner");
  await expect(page.locator("#selected-person-name")).toHaveText(
    TEST_PROFILE.name,
  );
  await page
    .getByLabel("Tracking profile")
    .selectOption({ label: "Freddy Test Dependant" });
  await page.getByRole("link", { name: "Family" }).click();
  const storedFamily = await page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("urbanfox-ilr", 4);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    return new Promise<string>((resolve, reject) => {
      const request = database
        .transaction("profiles", "readonly")
        .objectStore("profiles")
        .get("family-members");
      request.onsuccess = () => resolve(JSON.stringify(request.result));
      request.onerror = () => reject(request.error);
    });
  });
  expect(storedFamily).not.toContain("Freddy Test Dependant");
  expect(storedFamily).toContain("ciphertext");

  await page
    .getByRole("button", { name: "Edit Freddy Test Dependant" })
    .click();
  await page.getByLabel("Full name").fill("Freddy Test Child");
  await page.getByRole("button", { name: "Save family member" }).click();
  await expect(
    page.getByRole("heading", { name: "Freddy Test Child", level: 3 }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Lock app" }).click();
  await enterPin(page, "Four-digit PIN", TEST_PROFILE.pin);
  await page.getByRole("link", { name: "Family" }).click();
  await expect(page.locator("#selected-person-name")).toHaveText(
    "Freddy Test Child",
  );

  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Delete Freddy Test Child" }).click();
  await expect(page.getByText("No family members added yet")).toBeVisible();
  await expect(page.getByLabel("Tracking profile")).toHaveValue("owner");
});

test("tracks encrypted immigration permissions without claiming eligibility", async ({
  page,
}) => {
  await page.goto("/");
  await createLocalProfile(page);
  await page
    .getByRole("button", { name: "Manage immigration history" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Immigration history" }),
  ).toBeVisible();
  await expect(page.getByText("No permissions recorded")).toBeVisible();
  await page.getByRole("button", { name: "Add permission" }).click();
  await page.getByLabel("Immigration route").selectOption("skilled-worker");
  await page.getByLabel("Permission held as").selectOption("main-applicant");
  await page.getByLabel(/Visa grant date/).fill("2023-12-15");
  await page.getByLabel("Permission start date").fill("2024-01-01");
  await page.getByLabel("Permission expiry date").fill("2026-12-31");
  await page.getByLabel("Actual UK arrival date").fill("2024-01-15");
  await page.getByRole("button", { name: "Save permission" }).click();

  await expect(
    page.getByRole("heading", { name: "Skilled Worker", level: 3 }),
  ).toBeVisible();
  await expect(page.getByText(/calculation is not active yet/i)).toBeVisible();
  const storedPermission = await page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("urbanfox-ilr", 4);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    return new Promise<string>((resolve, reject) => {
      const request = database
        .transaction("permissions", "readonly")
        .objectStore("permissions")
        .get("owner");
      request.onsuccess = () => resolve(JSON.stringify(request.result));
      request.onerror = () => reject(request.error);
    });
  });
  expect(storedPermission).not.toContain("skilled-worker");
  expect(storedPermission).toContain("ciphertext");

  await page.getByRole("button", { name: "Edit Skilled Worker" }).click();
  await page.getByLabel("Permission expiry date").fill("2027-12-31");
  await page.getByRole("button", { name: "Save permission" }).click();
  await expect(page.getByText("2027-12-31")).toBeVisible();

  await page.getByRole("button", { name: "Lock app" }).click();
  await enterPin(page, "Four-digit PIN", TEST_PROFILE.pin);
  await page
    .getByRole("button", { name: "Manage immigration history" })
    .click();
  await expect(page.getByText("2027-12-31")).toBeVisible();

  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Delete Skilled Worker" }).click();
  await expect(page.getByText("No permissions recorded")).toBeVisible();
});

test("tracks encrypted trips, open travel, and overlap warnings", async ({
  page,
}) => {
  await page.goto("/");
  await createLocalProfile(page);
  await page.getByRole("link", { name: "Trips", exact: true }).click();

  await expect(
    page.getByRole("heading", { name: "Trips outside the UK" }),
  ).toBeVisible();
  await expect(page.getByText("No trips recorded")).toBeVisible();
  await page.getByRole("button", { name: "Add trip" }).click();
  await page.getByLabel("UK departure date").fill("2024-02-01");
  await page.getByLabel(/UK return date/).fill("2024-02-10");
  await page.getByLabel("Destination").fill("India");
  await page.getByLabel(/Notes/).fill("Family visit");
  await page.getByLabel("Flag for manual review").check();
  await page.getByRole("button", { name: "Save trip" }).click();

  await expect(
    page.getByRole("heading", { name: "India", level: 3 }),
  ).toBeVisible();
  await expect(page.getByText("Manual review flagged")).toBeVisible();
  await expect(page.getByText("8", { exact: true })).toBeVisible();
  const storedTrip = await page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("urbanfox-ilr", 4);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    return new Promise<string>((resolve, reject) => {
      const request = database
        .transaction("trips", "readonly")
        .objectStore("trips")
        .get("owner");
      request.onsuccess = () => resolve(JSON.stringify(request.result));
      request.onerror = () => reject(request.error);
    });
  });
  expect(storedTrip).not.toContain("India");
  expect(storedTrip).toContain("ciphertext");

  await page.getByRole("button", { name: "Add trip" }).click();
  await page.getByLabel("UK departure date").fill("2024-02-05");
  await page.getByLabel(/UK return date/).fill("2024-02-12");
  await page.getByLabel("Destination").fill("France");
  await page.getByRole("button", { name: "Save trip" }).click();
  await expect(page.getByRole("alert")).toContainText(
    "overlaps the existing trip to India",
  );
  await page.getByRole("button", { name: "Close trip form" }).click();

  await page.getByRole("button", { name: "Edit trip to India" }).click();
  await page.getByLabel(/UK return date/).fill("2024-02-12");
  await page.getByRole("button", { name: "Save trip" }).click();
  await expect(page.getByText("2024-02-12")).toBeVisible();

  await page.getByRole("button", { name: "Add trip" }).click();
  await page.getByLabel("UK departure date").fill("2025-01-01");
  await page.getByLabel("Destination").fill("Canada");
  await page.getByRole("button", { name: "Save trip" }).click();
  await expect(page.getByText("Open trip")).toBeVisible();
  await expect(page.getByText("Pending return")).toBeVisible();

  await page.getByRole("button", { name: "Lock app" }).click();
  await enterPin(page, "Four-digit PIN", TEST_PROFILE.pin);
  await page.getByRole("link", { name: "Trips", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Canada", level: 3 }),
  ).toBeVisible();

  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Delete trip to Canada" }).click();
  await expect(
    page.getByRole("heading", { name: "Canada", level: 3 }),
  ).toHaveCount(0);
});

test("shows a sourced recorded-absence warning without claiming eligibility", async ({
  page,
}) => {
  await page.goto("/");
  await createLocalProfile(page);
  await expect(
    page.getByRole("heading", { name: "Add immigration permission history" }),
  ).toBeVisible();

  await page
    .getByRole("button", { name: "Manage immigration history" })
    .click();
  await page.getByRole("button", { name: "Add permission" }).click();
  await page.getByLabel("Immigration route").selectOption("skilled-worker");
  await page.getByLabel("Permission held as").selectOption("main-applicant");
  await page.getByLabel(/Visa grant date/).fill("2022-01-01");
  await page.getByLabel("Permission start date").fill("2022-01-01");
  await page.getByLabel("Permission expiry date").fill("2028-01-01");
  await page.getByLabel("Actual UK arrival date").fill("2022-01-01");
  await page.getByRole("button", { name: "Save permission" }).click();
  await page.getByRole("link", { name: "Home", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "No complete absence days recorded" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Manage trips" }).click();
  await page.getByRole("button", { name: "Add trip" }).click();
  await page.getByLabel("UK departure date").fill("2024-01-01");
  await page.getByLabel(/UK return date/).fill("2024-07-01");
  await page.getByLabel("Destination").fill("Test destination");
  await page.getByRole("button", { name: "Save trip" }).click();
  await page.getByRole("link", { name: "Home", exact: true }).click();

  await expect(page.getByText("Potential limit issue")).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: "181 recorded days in one rolling year",
    }),
  ).toBeVisible();
  await expect(
    page.getByText(/does not determine ILR eligibility/i),
  ).toBeVisible();
  await page.getByText("Method and official sources").click();
  await expect(
    page.getByRole("link", {
      name: "Immigration Rules Appendix Continuous Residence",
    }),
  ).toBeVisible();
});

test("keeps fixed chrome and compacts the mobile menu while scrolling", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "mobile-chromium");
  await page.goto("/");
  await createLocalProfile(page);

  await page.getByRole("main").evaluate((main) => {
    main.style.minHeight = "150vh";
  });

  const navigation = page.getByRole("navigation", {
    name: "Primary navigation",
  });
  const header = page.locator(".top-bar");
  const navigationBox = await navigation.boundingBox();
  const viewport = await page.evaluate(() => ({
    height: window.innerHeight,
    width: window.innerWidth,
  }));
  const navigationStyles = await navigation.evaluate((element) => {
    const style = window.getComputedStyle(element);
    return {
      background: style.backgroundColor,
      borderRadius: style.borderRadius,
    };
  });

  expect(navigationBox).not.toBeNull();
  expect(navigationBox?.x).toBeGreaterThan(0);
  expect(navigationBox?.width).toBeLessThan(viewport.width);
  expect((navigationBox?.y ?? 0) + (navigationBox?.height ?? 0)).toBeLessThan(
    viewport.height,
  );
  expect(navigationStyles.background).toContain("0.72");
  expect(navigationStyles.borderRadius).not.toBe("0px");
  await expect(header).toHaveCSS("position", "sticky");
  await expect(navigation.locator(".navigation-label").first()).toHaveCSS(
    "position",
    "absolute",
  );

  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await expect
    .poll(() => page.evaluate(() => window.scrollY))
    .toBeGreaterThan(32);
  await expect(navigation).toHaveClass(/is-scroll-compact/);
  await expect(navigation).toHaveCSS(
    "background-color",
    "rgba(255, 255, 255, 0.54)",
  );

  const compactNavigationBox = await navigation.boundingBox();
  const compactNavigationBackground = await navigation.evaluate(
    (element) => window.getComputedStyle(element).backgroundColor,
  );
  const scrolledHeaderBox = await header.boundingBox();

  expect(compactNavigationBox?.width).toBeLessThan(navigationBox?.width ?? 0);
  expect(compactNavigationBox?.height).toBeLessThan(navigationBox?.height ?? 0);
  expect(compactNavigationBackground).toContain("0.54");
  expect(scrolledHeaderBox?.y).toBeLessThanOrEqual(1);
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
  await expect(page.locator(".top-bar")).toHaveCSS("position", "sticky");
  await expect(
    page
      .getByRole("navigation", { name: "Primary navigation" })
      .getByText("Home", { exact: true }),
  ).toBeVisible();

  await page.getByRole("main").evaluate((main) => {
    main.style.minHeight = "150vh";
  });
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await expect
    .poll(() => page.evaluate(() => window.scrollY))
    .toBeGreaterThan(0);

  const scrolledHeaderBox = await page.locator(".top-bar").boundingBox();
  expect(scrolledHeaderBox?.y).toBeLessThanOrEqual(1);
});

test("registers the offline app service worker", async ({ page }) => {
  await page.goto("/");

  const registrationScope = await page.evaluate(async () => {
    const registration = await navigator.serviceWorker.ready;
    return registration.scope;
  });

  expect(registrationScope).toContain("127.0.0.1:4173");
});
