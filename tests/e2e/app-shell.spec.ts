import { expect, test } from "@playwright/test";
import { readFile } from "node:fs/promises";
import { RELEASE_NOTES } from "../../src/configuration/release-metadata";

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
  await page.getByLabel("Immigration role").selectOption("dependant");
  await page.getByRole("button", { name: "Create household member" }).click();
  await expect(
    page.getByRole("link", { name: "ILR", exact: true }).first(),
  ).toHaveAttribute("aria-current", "page");
  await page.getByRole("link", { name: "Family", exact: true }).first().click();
  await expect(
    page.getByRole("heading", { name: "Family Overview" }),
  ).toBeVisible();
  await expect(
    page.getByText(
      "Manage household profiles and review each person’s recorded ILR information.",
    ),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: `Edit ${TEST_PROFILE.name}` }),
  ).toBeVisible();
}

async function enterPin(
  page: import("@playwright/test").Page,
  label: string,
  pin: string,
): Promise<void> {
  if (label === "Four-digit PIN") {
    for (const digit of pin) {
      await page.getByRole("button", { name: `Enter ${digit}` }).click();
    }
    return;
  }

  for (const [index, digit] of [...pin].entries()) {
    await page.getByLabel(`${label} digit ${index + 1}`).fill(digit);
  }
}

async function fillStructuredAddress(
  scope: import("@playwright/test").Locator,
  address: {
    flatBuilding?: string;
    houseNumberName: string;
    street: string;
    locality?: string;
    townCity: string;
    county?: string;
    postcode: string;
  },
): Promise<void> {
  if (address.flatBuilding)
    await scope.getByLabel(/^Flat \/ building/).fill(address.flatBuilding);
  await scope.getByLabel("House number / name").fill(address.houseNumberName);
  await scope.getByLabel("Street").fill(address.street);
  if (address.locality)
    await scope.getByLabel(/^Locality/).fill(address.locality);
  await scope.getByLabel("Town / city").fill(address.townCity);
  if (address.county) await scope.getByLabel(/^County/).fill(address.county);
  await scope.getByLabel("Postcode").fill(address.postcode);
}

test("locks zoom in the mobile viewport metadata", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "mobile-chromium");
  await page.goto("/");

  const viewportContent = await page
    .locator('meta[name="viewport"]')
    .getAttribute("content");

  expect(viewportContent).toContain("width=device-width");
  expect(viewportContent).toContain("initial-scale=1.0");
  expect(viewportContent).toContain("maximum-scale=1.0");
  expect(viewportContent).toContain("user-scalable=no");
  expect(viewportContent).toContain("viewport-fit=cover");
});

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
  const buttonTheme = await getStartedButton.evaluate((button) => {
    const style = window.getComputedStyle(button);
    return {
      backgroundImage: style.backgroundImage,
      text: style.color,
    };
  });

  expect(buttonTheme.backgroundImage).toContain("linear-gradient");
  expect(buttonTheme.text).toBe("rgb(255, 255, 255)");
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
  const installDialog = page.getByRole("dialog", {
    name: "Install and updates",
  });
  await expect(installDialog).toBeVisible();
  await expect(installDialog).toHaveClass(/liquid-dialog/);
  await page.evaluate(() =>
    document.documentElement.setAttribute("data-theme", "dark"),
  );
  await expect(installDialog).toHaveCSS(
    "background-color",
    "rgba(39, 24, 59, 0.88)",
  );
  await expect(page.getByText("Installed", { exact: true })).toBeVisible();
  await expect(page.getByText("Latest", { exact: true })).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Check for updates" }),
  ).toBeVisible();
  for (const note of RELEASE_NOTES) {
    await expect(installDialog.getByText(note, { exact: true })).toBeVisible();
  }
  await expect(
    page.getByText("Added a protected forgotten-PIN reset", { exact: false }),
  ).toHaveCount(0);
});

test("hides the install action when the app is already installed", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const nativeMatchMedia = window.matchMedia.bind(window);
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      value: (query: string): MediaQueryList => {
        if (query !== "(display-mode: standalone)")
          return nativeMatchMedia(query);
        return {
          matches: true,
          media: query,
          onchange: null,
          addListener: () => undefined,
          removeListener: () => undefined,
          addEventListener: () => undefined,
          removeEventListener: () => undefined,
          dispatchEvent: () => false,
        };
      },
    });
  });
  await page.goto("/");
  await page.getByRole("button", { name: "Install and updates" }).click();

  await expect(page.getByRole("button", { name: "App installed" })).toHaveCount(
    0,
  );
  await expect(page.getByRole("button", { name: "Install app" })).toHaveCount(
    0,
  );
  await expect(
    page.getByText("UrbanFox ILR is installed on this device."),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Check for updates" }),
  ).toBeVisible();
});

test("highlights the header control when an update is available", async ({
  page,
}) => {
  await page.route("**/release.json?check=**", async (route) =>
    route.fulfill({
      contentType: "application/json",
      body: JSON.stringify({
        version: "99.0.0",
        notes: ["Test update"],
      }),
    }),
  );
  await page.goto("/");

  const trigger = page.locator(".app-manager-trigger");
  await expect(trigger).toHaveClass(/is-update-available/);
  await expect(trigger).toHaveAttribute(
    "aria-label",
    "Update 99.0.0 available",
  );
  await expect(trigger).toHaveCSS("background-image", /linear-gradient/);
  await expect(trigger).toHaveCSS("border-color", "rgba(182, 0, 90, 0.62)");
  await expect(trigger).toHaveCSS("box-shadow", /238, 9, 121/);

  await page.evaluate(() =>
    document.documentElement.setAttribute("data-theme", "dark"),
  );
  await expect(trigger).toHaveCSS("border-color", "rgba(255, 177, 197, 0.78)");
  await expect(trigger).toHaveCSS("box-shadow", /238, 9, 121/);

  await expect(page.locator("#download-update")).toHaveText("Download update");
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
  await expect(page.getByRole("button", { name: "Forgot PIN?" })).toHaveCount(
    0,
  );
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
      const request = indexedDB.open("urbanfox-ilr", 8);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    return new Promise<string>((resolve, reject) => {
      const request = database
        .transaction("profiles", "readonly")
        .objectStore("profiles")
        .get("household-members");
      request.onsuccess = () => resolve(JSON.stringify(request.result));
      request.onerror = () => reject(request.error);
    });
  });
  expect(storedProfile).not.toContain(TEST_PROFILE.name);
  expect(storedProfile).toContain("ciphertext");
  await page.getByRole("button", { name: "Lock app" }).click();

  await expect(
    page.getByRole("heading", { name: "Enter Security PIN" }),
  ).toBeVisible();
  await expect(page.locator(".security-logo-mark")).toBeVisible();
  await expect(page.locator(".security-logo-mark img")).toHaveCSS(
    "border-radius",
    "24px",
  );
  await expect(page.locator(".security-logo-orb")).toHaveCount(0);
  await expect(page.locator(".security-keypad-copy h1")).toHaveCSS(
    "color",
    "rgb(35, 20, 55)",
  );
  await expect(page.locator(".security-keypad-key").first()).toHaveCSS(
    "color",
    "rgb(35, 20, 55)",
  );
  await page.evaluate(() =>
    document.documentElement.setAttribute("data-theme", "dark"),
  );
  await expect(page.locator(".security-keypad-copy h1")).toHaveCSS(
    "color",
    "rgb(255, 255, 255)",
  );
  await page.getByRole("button", { name: "Enter 1" }).click();
  const filledIndicator = page.locator("[data-pin-indicator].is-filled");
  await expect(filledIndicator).toHaveCount(1);
  await expect(filledIndicator).toHaveCSS(
    "background-image",
    /linear-gradient/,
  );
  await expect(filledIndicator).toHaveCSS("border-color", "rgba(0, 0, 0, 0)");
  await page.evaluate(() =>
    document.documentElement.setAttribute("data-theme", "light"),
  );
  await enterPin(page, "Four-digit PIN", "111");
  await expect(page.getByRole("alert")).toContainText("could not unlock");

  await enterPin(page, "Four-digit PIN", TEST_PROFILE.pin);
  await expect(
    page.getByRole("link", { name: "ILR", exact: true }).first(),
  ).toHaveAttribute("aria-current", "page");

  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Enter Security PIN" }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Get started" })).toHaveCount(
    0,
  );
  await expect(page.locator(".pin-digit")).toHaveCount(4);
  await expect(page.locator(".security-keypad-key")).toHaveCount(10);
  const numberOne = page.getByRole("button", { name: "Enter 1" });
  const didStartPopAnimation = await numberOne.evaluate((button) => {
    button.dispatchEvent(new MouseEvent("click", { bubbles: true }));
    return button.classList.contains("is-popping");
  });
  expect(didStartPopAnimation).toBe(true);
  await numberOne.evaluate((button) => button.classList.add("is-popping"));
  await expect(numberOne).toHaveCSS("animation-name", "security-key-pop");
  await expect(page.locator("[data-pin-indicator]")).toHaveCount(4);
  await page.getByRole("button", { name: "Delete last PIN digit" }).click();
  await enterPin(page, "Four-digit PIN", TEST_PROFILE.pin);
  await expect(
    page.getByRole("link", { name: "ILR", exact: true }).first(),
  ).toHaveAttribute("aria-current", "page");
});

test("guides Address History from the current address backwards", async ({
  page,
}) => {
  await page.goto("/");
  await createLocalProfile(page);

  await page.getByRole("link", { name: "ILR", exact: true }).click();
  await page.getByRole("button", { name: "+ Add past visa" }).click();
  await page.getByRole("button", { name: "Add permission" }).click();
  await page.getByLabel("Immigration route").selectOption("skilled-worker");
  await page.getByLabel("Permission held as").selectOption("main-applicant");
  await page.getByLabel(/Visa grant date/).fill("2021-09-01");
  await page.getByLabel("Permission start date").fill("2021-09-01");
  await page.getByLabel("Permission expiry date").fill("2027-09-01");
  await page.getByLabel("Actual UK arrival date").fill("2021-09-01");
  await page.getByRole("button", { name: "Save permission" }).click();

  await page.getByRole("link", { name: "Vault" }).first().click();
  const addressSection = page.locator('[data-vault-section="address-history"]');
  await addressSection.locator("summary").click();
  await expect(
    addressSection.getByRole("button", { name: "Add address" }),
  ).toBeVisible();
  await addressSection.getByRole("button", { name: "Add address" }).click();

  let dialog = page.getByRole("dialog", { name: "Address History" });
  const currentAddressHost = dialog.locator("[data-address-new-current-host]");
  await expect(dialog).toBeVisible();
  await expect
    .poll(() =>
      dialog.evaluate(
        (element) =>
          document.activeElement?.classList.contains("liquid-dialog-close") ===
            true && element.contains(document.activeElement),
      ),
    )
    .toBe(true);
  await expect(dialog.getByText("No addresses recorded yet")).toHaveCount(0);
  await expect(dialog.getByText(/Work backwards.*Sept 2021/)).toBeVisible();
  await expect(dialog.getByLabel("Start month")).toHaveValue("");
  await expect(
    currentAddressHost.getByLabel("House number / name"),
  ).toBeVisible();
  await expect(dialog.getByLabel("This is my current address")).toBeChecked();
  await expect(dialog.getByLabel("This is my current address")).toBeDisabled();
  await expect(dialog.getByLabel("This is my current address")).toBeVisible();
  await expect(dialog.getByLabel("End month")).toBeHidden();
  await expect(dialog.getByLabel("Notes")).toHaveCount(0);

  const addressEvidence = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
    "base64",
  );
  await fillStructuredAddress(currentAddressHost, {
    houseNumberName: "3",
    street: "Current Avenue",
    townCity: "Bristol",
    postcode: "BS3 3CC",
  });
  await dialog.getByLabel("Start month").fill("2025-01");
  await dialog.getByLabel("Address evidence").setInputFiles({
    name: "current-address-proof.png",
    mimeType: "image/png",
    buffer: addressEvidence,
  });
  await dialog.getByRole("button", { name: "Save & continue" }).click();

  dialog = page.getByRole("dialog", { name: "Address History" });
  await expect(dialog).toBeVisible();
  await expect(
    addressSection.getByText("Partial", { exact: true }),
  ).toBeVisible();
  await expect(
    addressSection.getByText(
      "Address History is partly recorded. Continue the timeline and add supporting evidence.",
      { exact: true },
    ),
  ).toBeVisible();
  await expect(
    addressSection.locator('[data-add-vault-section="address-history"]'),
  ).toHaveText("Edit address");
  await expect(dialog.getByLabel("This is my current address")).toBeHidden();
  await expect(
    dialog
      .locator("[data-address-previous-host]")
      .getByLabel("House number / name"),
  ).toBeVisible();
  await expect(dialog.getByLabel("End month")).toBeVisible();
  await expect(dialog.getByLabel("End month")).toHaveValue("2024-12");
  await expect(dialog.getByLabel("End month")).toHaveAttribute(
    "aria-readonly",
    "true",
  );
  await expect(dialog.getByLabel("Start month")).toHaveValue("");

  const endMonthBox = await dialog.getByLabel("End month").boundingBox();
  const evidenceBox = await dialog
    .locator("[data-address-evidence]")
    .boundingBox();
  expect(endMonthBox).not.toBeNull();
  expect(evidenceBox).not.toBeNull();
  if (endMonthBox && evidenceBox)
    expect(
      evidenceBox.y - (endMonthBox.y + endMonthBox.height),
    ).toBeGreaterThan(8);

  await fillStructuredAddress(dialog.locator("[data-address-previous-host]"), {
    houseNumberName: "2",
    street: "Previous Road",
    townCity: "Bristol",
    postcode: "BS2 2BB",
  });
  await dialog.getByLabel("Start month").fill("2023-07");
  await dialog.getByRole("button", { name: "Save & continue" }).click();

  dialog = page.getByRole("dialog", { name: "Address History" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByLabel("End month")).toHaveValue("2023-06");
  await fillStructuredAddress(dialog.locator("[data-address-previous-host]"), {
    houseNumberName: "1",
    street: "First Street",
    townCity: "Bristol",
    postcode: "BS1 1AA",
  });
  await dialog.getByLabel("Start month").fill("2021-09");
  await dialog.getByRole("button", { name: "Save & continue" }).click();
  dialog = page.getByRole("dialog", { name: "Address History" });
  await expect(dialog).toBeVisible();
  await expect(
    addressSection.getByText("Complete", { exact: true }),
  ).toBeVisible();
  await expect(
    dialog
      .getByLabel("Recorded addresses")
      .getByText("Current address", { exact: true }),
  ).toBeVisible();
  await expect(
    dialog.getByText("3 Current Avenue, Bristol, BS3 3CC"),
  ).toBeVisible();
  await expect(
    dialog.getByText("Previous address 1", { exact: true }),
  ).toBeVisible();
  await expect(
    dialog.getByText("2 Previous Road, Bristol, BS2 2BB"),
  ).toBeVisible();
  await expect(
    dialog.getByText("Previous address 2", { exact: true }),
  ).toBeVisible();
  await expect(
    dialog.getByText("1 First Street, Bristol, BS1 1AA"),
  ).toBeVisible();
  await expect(dialog.getByText("1 evidence file")).toBeVisible();
  await dialog.getByRole("button", { name: "Close address history" }).click();
  if (
    !(await addressSection.evaluate((section) => section.hasAttribute("open")))
  )
    await addressSection.locator("summary").click();
  const savedAddresses = addressSection.getByRole("list", {
    name: "Saved addresses",
  });
  await expect(savedAddresses.getByRole("listitem")).toHaveCount(3);
  await expect(savedAddresses.getByRole("listitem").nth(0)).toContainText(
    "Current address3 Current Avenue, Bristol, BS3 3CCJan 2025 – Present",
  );
  await expect(savedAddresses.getByRole("listitem").nth(1)).toContainText(
    "Previous address 12 Previous Road, Bristol, BS2 2BBJul 2023 – Dec 2024",
  );
  await expect(savedAddresses.getByRole("listitem").nth(2)).toContainText(
    "Previous address 21 First Street, Bristol, BS1 1AASept 2021 – Jun 2023",
  );

  const addressDownloads: import("@playwright/test").Download[] = [];
  page.on("download", (download) => addressDownloads.push(download));
  await addressSection
    .getByRole("button", { name: "Download address files + index" })
    .click();
  await expect.poll(() => addressDownloads.length).toBe(2);
  expect(
    addressDownloads.map((download) => download.suggestedFilename()),
  ).toEqual(
    expect.arrayContaining([
      "Urban-Fox-Test-User-Address-History-Index.pdf",
      "Current address - current-address-proof.png",
    ]),
  );

  await addressSection.getByRole("button", { name: "Edit address" }).click();
  dialog = page.getByRole("dialog", { name: "Address History" });
  await expect(
    dialog
      .locator("[data-address-previous-host]")
      .getByLabel("House number / name"),
  ).toBeHidden();
  await expect(
    dialog.getByRole("button", { name: "Save & continue" }),
  ).toBeHidden();

  const currentCard = dialog
    .locator(".address-history-item")
    .filter({ hasText: "Current address" });
  await currentCard.getByRole("button", { name: "Edit" }).click();
  await expect(
    currentAddressHost.getByLabel("House number / name"),
  ).toBeVisible();
  const saveAddressButton = currentAddressHost.getByRole("button", {
    name: "Save",
    exact: true,
  });
  const cancelAddressButton = currentAddressHost.getByRole("button", {
    name: "Cancel",
  });
  await expect(saveAddressButton).toBeVisible();
  const saveAddressBox = await saveAddressButton.boundingBox();
  const cancelAddressBox = await cancelAddressButton.boundingBox();
  expect(saveAddressBox).not.toBeNull();
  expect(cancelAddressBox).not.toBeNull();
  expect(saveAddressBox?.width).toBeCloseTo(cancelAddressBox?.width ?? 0, 0);
  expect(saveAddressBox?.height).toBeCloseTo(cancelAddressBox?.height ?? 0, 0);
  await cancelAddressButton.click();
  await expect(
    currentAddressHost.getByLabel("House number / name"),
  ).toBeHidden();
  const addCurrentButton = dialog.getByRole("button", {
    name: "Add new current address",
  });
  await expect(addCurrentButton).toBeVisible();
  const coverageBox = await dialog
    .locator(".address-coverage-card")
    .boundingBox();
  const addCurrentBox = await addCurrentButton.boundingBox();
  expect(coverageBox).not.toBeNull();
  expect(addCurrentBox).not.toBeNull();
  if (coverageBox && addCurrentBox)
    expect(
      addCurrentBox.y - (coverageBox.y + coverageBox.height),
    ).toBeLessThanOrEqual(24);

  await addCurrentButton.click();
  const newCurrentHost = dialog.locator("[data-address-new-current-host]");
  await expect(newCurrentHost.getByLabel("House number / name")).toBeVisible();
  await expect(
    dialog.getByRole("button", { name: "Add new current address" }),
  ).toBeHidden();
  await expect(
    newCurrentHost.getByRole("button", { name: "Cancel" }),
  ).toBeVisible();
  await newCurrentHost.getByLabel("House number / name").fill("Temporary");
  await newCurrentHost.getByRole("button", { name: "Cancel" }).click();
  await expect(newCurrentHost.getByRole("textbox")).toHaveCount(0);
  await expect(
    dialog.getByRole("button", { name: "Add new current address" }),
  ).toBeVisible();
  await expect(
    currentCard.getByText("3 Current Avenue, Bristol, BS3 3CC"),
  ).toBeVisible();

  await dialog.getByRole("button", { name: "Add new current address" }).click();
  const reopenedNewCurrentHost = dialog.locator(
    "[data-address-new-current-host]",
  );
  const newCurrentFormBox = await reopenedNewCurrentHost.boundingBox();
  const currentCardBox = await currentCard.boundingBox();
  expect(newCurrentFormBox).not.toBeNull();
  expect(currentCardBox).not.toBeNull();
  if (newCurrentFormBox && currentCardBox)
    expect(newCurrentFormBox.y).toBeLessThan(currentCardBox.y);
  await expect(
    reopenedNewCurrentHost.getByLabel("House number / name"),
  ).toBeVisible();
  await expect(
    reopenedNewCurrentHost.getByRole("button", { name: "Save" }),
  ).toBeVisible();
  await expect(dialog.getByLabel("End month")).toBeHidden();
  await fillStructuredAddress(reopenedNewCurrentHost, {
    houseNumberName: "4",
    street: "New Home Close",
    townCity: "Bristol",
    postcode: "BS4 4DD",
  });
  await dialog.getByLabel("Start month").fill("2026-09");
  await dialog.getByRole("button", { name: "Save" }).click();
  dialog = page.getByRole("dialog", { name: "Address History" });
  await expect(dialog).toBeVisible();
  await expect(
    addressSection.getByText("Complete", { exact: true }),
  ).toBeVisible();
  await expect(
    dialog.getByText("4 New Home Close, Bristol, BS4 4DD"),
  ).toBeVisible();
  await expect(
    dialog.getByText("3 Current Avenue, Bristol, BS3 3CC"),
  ).toBeVisible();
  await expect(
    dialog
      .getByLabel("Recorded addresses")
      .getByText("Current address", { exact: true }),
  ).toBeVisible();
  await expect(
    dialog.getByText("Previous address 1", { exact: true }),
  ).toBeVisible();
  await expect(dialog.getByText(/Jan 2025.*Aug 2026/)).toBeVisible();
  await expect(
    dialog.getByText("Previous address 2", { exact: true }),
  ).toBeVisible();
  await expect(
    dialog.getByText("Previous address 3", { exact: true }),
  ).toBeVisible();

  page.once("dialog", async (confirmation) => confirmation.accept());
  const oldestCard = dialog
    .locator(".address-history-item")
    .filter({ hasText: "Previous address 3" });
  await oldestCard.getByRole("button", { name: "Delete" }).click();
  dialog = page.getByRole("dialog", { name: "Address History" });
  await expect(dialog).toBeVisible();
  await expect(
    dialog.getByText("Previous address 3", { exact: true }),
  ).toHaveCount(0);

  const addressWithEvidence = dialog
    .locator(".address-history-item")
    .filter({ hasText: "3 Current Avenue, Bristol, BS3 3CC" });
  page.once("dialog", async (confirmation) => {
    expect(confirmation.message()).toContain(
      "1 linked proof document will be kept, unlinked, and marked as needing attention",
    );
    await confirmation.accept();
  });
  await addressWithEvidence.getByRole("button", { name: "Delete" }).click();
  dialog = page.getByRole("dialog", { name: "Address History" });
  await expect(
    dialog.getByText("3 Current Avenue, Bristol, BS3 3CC"),
  ).toHaveCount(0);
  await dialog.getByRole("button", { name: "Close address history" }).click();
  await expect(
    page.getByText("Needs attention · no address linked", { exact: true }),
  ).toBeVisible();
  await expect(
    addressSection.getByText("Partial", { exact: true }),
  ).toBeVisible();

  if (
    !(await addressSection.evaluate((section) => section.hasAttribute("open")))
  )
    await addressSection.locator("summary").click();
  await addressSection.getByRole("button", { name: "Edit address" }).click();
  dialog = page.getByRole("dialog", { name: "Address History" });
  const currentAddress = dialog
    .locator(".address-history-item")
    .filter({ hasText: "4 New Home Close, Bristol, BS4 4DD" });
  page.once("dialog", async (confirmation) => {
    expect(confirmation.message()).toContain(
      "Your timeline will have no current residence and will need attention",
    );
    expect(confirmation.message()).toContain(
      "use Add new current address instead",
    );
    await confirmation.accept();
  });
  await currentAddress.getByRole("button", { name: "Delete" }).click();
  dialog = page.getByRole("dialog", { name: "Address History" });
  await expect(dialog.getByLabel("House number / name")).toBeVisible();
  await expect(dialog.getByLabel("This is my current address")).toBeChecked();
  await dialog.getByRole("button", { name: "Close address history" }).click();
  if (
    !(await addressSection.evaluate((section) => section.hasAttribute("open")))
  )
    await addressSection.locator("summary").click();
  await expect(
    addressSection.getByRole("button", { name: "Add current address" }),
  ).toBeVisible();
  await expect(
    addressSection.getByText("No current address recorded", { exact: true }),
  ).toBeVisible();
});

test("stores and manages encrypted documents for a profile", async ({
  page,
}) => {
  await page.goto("/");
  await createLocalProfile(page);
  await page.getByRole("link", { name: "Vault" }).first().click();
  await expect(
    page.getByRole("heading", {
      name: "Evidence readiness",
      exact: true,
      level: 1,
    }),
  ).toBeVisible();
  await expect(page.getByRole("button", { name: "Add document" })).toHaveCount(
    0,
  );
  await expect(
    page.getByRole("heading", { name: "Document Vault", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByText("Encrypted on this device", { exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("main").getByRole("region").first(),
  ).toHaveAccessibleName("Household cohort");
  await expect(page.getByText("No documents added yet")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Identity & Immigration" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Address History" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Final Application Documents" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "DOWNLOAD ZIP BUNDLE" }),
  ).toBeDisabled();
  await expect(
    page.getByRole("progressbar", { name: "Document Vault readiness" }),
  ).toHaveAttribute("aria-valuenow", "0");
  await expect(
    page.locator('[data-vault-section="salary-tax"]').getByText("To do"),
  ).toBeVisible();
  await expect(
    page.locator('[data-vault-section="final-application"]').getByText("To do"),
  ).toBeVisible();

  const addressSection = page.locator('[data-vault-section="address-history"]');
  await addressSection.locator("summary").click();
  await addressSection.getByRole("button", { name: "Add address" }).click();
  const addressDialog = page.getByRole("dialog", { name: "Address History" });
  await expect(addressDialog).toBeVisible();
  await expect(addressDialog.getByLabel("End month")).toBeHidden();
  const inputBox = await addressDialog.getByLabel("Start month").boundingBox();
  const dialogBox = await addressDialog.boundingBox();
  expect(inputBox).not.toBeNull();
  expect(dialogBox).not.toBeNull();
  if (inputBox && dialogBox) {
    expect(inputBox.x).toBeGreaterThanOrEqual(dialogBox.x);
    expect(inputBox.x + inputBox.width).toBeLessThanOrEqual(
      dialogBox.x + dialogBox.width + 1,
    );
  }
  await addressDialog
    .getByRole("button", { name: "Close address history" })
    .click();

  const lifeEnglishSection = page.locator(
    '[data-vault-section="life-english"]',
  );
  await lifeEnglishSection.locator("summary").click();
  await lifeEnglishSection
    .getByRole("button", { name: "Add Life in the UK evidence" })
    .click();
  const lifeEnglishDialog = page.getByRole("dialog", {
    name: "Add Life in the UK evidence",
  });
  await expect(lifeEnglishDialog).toBeVisible();
  await expect(lifeEnglishDialog.getByLabel("Passed date")).toBeHidden();
  await lifeEnglishDialog.getByLabel("Status").selectOption("passed");
  await expect(lifeEnglishDialog.getByLabel("Passed date")).toBeVisible();
  const lifePanelBox = await lifeEnglishDialog
    .locator(".life-english-panel")
    .boundingBox();
  const statusBox = await lifeEnglishDialog.getByLabel("Status").boundingBox();
  const passedDateBox = await lifeEnglishDialog
    .getByLabel("Passed date")
    .boundingBox();
  expect(lifePanelBox).not.toBeNull();
  expect(statusBox).not.toBeNull();
  expect(passedDateBox).not.toBeNull();
  if (statusBox && passedDateBox)
    expect(Math.round(passedDateBox.height)).toBe(Math.round(statusBox.height));
  if (lifePanelBox && passedDateBox) {
    expect(passedDateBox.x).toBeGreaterThanOrEqual(lifePanelBox.x);
    expect(passedDateBox.x + passedDateBox.width).toBeLessThanOrEqual(
      lifePanelBox.x + lifePanelBox.width + 1,
    );
  }
  await expect(
    lifeEnglishDialog.locator(".life-english-panel").first(),
  ).toHaveCSS("overflow-x", "hidden");
  await lifeEnglishDialog.getByLabel("Passed date").fill("2026-08-20");
  await lifeEnglishDialog
    .getByLabel("UAN / reference number")
    .fill("UAN-TEST-123");
  const tinyPng = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
    "base64",
  );
  await lifeEnglishDialog
    .getByLabel("Life in the UK evidence", { exact: true })
    .setInputFiles({
      name: "life-test-evidence.png",
      mimeType: "image/png",
      buffer: tinyPng,
    });
  await expect(
    lifeEnglishDialog.getByText("life-test-evidence.png"),
  ).toBeVisible();
  await expect(page.getByRole("dialog", { name: "Add document" })).toHaveCount(
    0,
  );
  await lifeEnglishDialog.getByRole("button", { name: "Save" }).click();
  await expect(
    page.locator('[data-vault-section="life-english"]').getByText("Partial"),
  ).toBeVisible();

  const updatedLifeEnglishSection = page.locator(
    '[data-vault-section="life-english"]',
  );
  await updatedLifeEnglishSection.locator("summary").click();
  await updatedLifeEnglishSection
    .getByRole("button", { name: "Add English-language evidence" })
    .click();
  const englishDialog = page.getByRole("dialog", {
    name: "Add English-language evidence",
  });
  await englishDialog.getByLabel("Status").selectOption("met");
  await englishDialog
    .getByLabel("Evidence type")
    .fill("Approved qualification");
  await englishDialog
    .getByLabel("Certificate / reference number")
    .fill("ENG-TEST-456");
  await englishDialog
    .getByLabel("English evidence", { exact: true })
    .setInputFiles({
      name: "english-test-evidence.png",
      mimeType: "image/png",
      buffer: tinyPng,
    });
  await expect(
    englishDialog.getByText("english-test-evidence.png"),
  ).toBeVisible();
  await englishDialog.getByRole("button", { name: "Save" }).click();
  await expect(
    page.locator('[data-vault-section="life-english"]').getByText("Complete"),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "life test evidence" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "english test evidence" }),
  ).toBeVisible();

  const salarySection = page.locator('[data-vault-section="salary-tax"]');
  await salarySection.locator("summary").click();
  await salarySection.getByRole("button", { name: "Add Payslip" }).click();
  const addDocumentDialog = page.getByRole("dialog", { name: "Add Payslip" });
  await expect(addDocumentDialog).toHaveClass(/liquid-dialog/);
  await expect(
    addDocumentDialog.locator('option[value="passport"]'),
  ).toHaveCount(1);
  await expect(
    addDocumentDialog.locator('option[value="immigration-evidence"]'),
  ).toHaveCount(1);
  await addDocumentDialog.getByLabel("Document file").setInputFiles({
    name: "council-tax.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
      "base64",
    ),
  });
  await addDocumentDialog
    .getByLabel("Document name")
    .fill("Council tax statement");
  await page.getByRole("button", { name: "Encrypt and save document" }).click();
  await expect(
    page.getByRole("heading", { name: "Council tax statement" }),
  ).toBeVisible();
  const storedDocument = await page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("urbanfox-ilr", 8);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    return new Promise<string>((resolve, reject) => {
      const request = database
        .transaction("documents", "readonly")
        .objectStore("documents")
        .getAll();
      request.onsuccess = () => resolve(JSON.stringify(request.result));
      request.onerror = () => reject(request.error);
    });
  });
  expect(storedDocument).toContain("ciphertext");
  expect(storedDocument).not.toContain("Council tax statement");
  expect(storedDocument).not.toContain("council-tax.png");

  const downloadPromise = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Download Council tax statement" })
    .click();
  expect((await downloadPromise).suggestedFilename()).toBe("council-tax.png");

  const bundleDownloadPromise = page.waitForEvent("download");
  const bundleButton = page.getByRole("button", {
    name: "DOWNLOAD ZIP BUNDLE",
  });
  await expect(bundleButton.locator("svg")).toHaveCount(1);
  await expect(bundleButton.locator("path")).toHaveCount(2);
  await expect(bundleButton.locator("rect")).toHaveCount(1);
  await bundleButton.click();
  expect((await bundleDownloadPromise).suggestedFilename()).toBe(
    "Urban-Fox-Test-User-ILR-Document-Bundle.zip",
  );
  await expect(
    page.getByRole("button", { name: "ZIP BUNDLE DOWNLOADED" }),
  ).toBeVisible();

  await page
    .getByRole("button", { name: "Rename Council tax statement" })
    .click();
  await page
    .getByRole("dialog", { name: "Rename document" })
    .getByLabel("Document name")
    .fill("Council tax bill");
  await page.getByRole("button", { name: "Save document name" }).click();
  await expect(
    page.getByRole("heading", { name: "Council tax bill" }),
  ).toBeVisible();

  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Delete Council tax bill" }).click();
  await expect(
    page.getByRole("heading", { name: "Council tax bill" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "life test evidence" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "english test evidence" }),
  ).toBeVisible();
});

test("adds and edits documents from non-address checklist items", async ({
  page,
}) => {
  await page.goto("/");
  await createLocalProfile(page);
  await page.getByRole("link", { name: "Vault" }).first().click();

  const employmentSection = page.locator('[data-vault-section="employment"]');
  await expect(
    employmentSection.getByText("To do", { exact: true }),
  ).toBeVisible();
  await employmentSection.locator("summary").click();
  await expect(
    employmentSection.getByRole("button", { name: "Add document" }),
  ).toHaveCount(0);
  await expect(
    page
      .locator(".vault-category-list")
      .getByRole("button", { name: "Add document" }),
  ).toHaveCount(0);
  await employmentSection
    .getByRole("button", { name: "Add employer letter" })
    .click();

  let dialog = page.getByRole("dialog", { name: "Add Employer letter" });
  await expect(dialog).toBeVisible();
  const documentFile = dialog.getByLabel("Document file");
  await expect(documentFile).toBeVisible();
  const fileControlMetrics = await documentFile.evaluate((input) => {
    const control = getComputedStyle(input);
    const button = getComputedStyle(input, "::file-selector-button");
    return {
      controlHeight: Number.parseFloat(control.height),
      paddingTop: Number.parseFloat(control.paddingTop),
      paddingBottom: Number.parseFloat(control.paddingBottom),
      buttonHeight: Number.parseFloat(button.height),
      buttonVerticalAlign: button.verticalAlign,
    };
  });
  expect(fileControlMetrics.paddingTop).toBe(fileControlMetrics.paddingBottom);
  expect(fileControlMetrics.buttonHeight).toBeLessThan(
    fileControlMetrics.controlHeight,
  );
  expect(fileControlMetrics.buttonVerticalAlign).toBe("middle");
  const cancelBox = await dialog
    .getByRole("button", { name: "Cancel" })
    .boundingBox();
  const saveBox = await dialog
    .getByRole("button", { name: "Encrypt and save document" })
    .boundingBox();
  expect(cancelBox?.width).toBe(saveBox?.width);
  expect(cancelBox?.height).toBe(saveBox?.height);
  await dialog.getByRole("button", { name: "Cancel" }).click();
  await expect(dialog).not.toBeVisible();
  await employmentSection
    .getByRole("button", { name: "Add employer letter" })
    .click();

  const tinyPng = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
    "base64",
  );
  dialog = page.getByRole("dialog", { name: "Add Employer letter" });
  await dialog.getByLabel("Document file").setInputFiles({
    name: "employer-letter.png",
    mimeType: "image/png",
    buffer: tinyPng,
  });
  await dialog.getByLabel("Document name").fill("Employer letter");
  await dialog
    .getByRole("button", { name: "Encrypt and save document" })
    .click();

  await expect(dialog).not.toBeVisible();
  await expect(
    employmentSection.getByText("Partial", { exact: true }),
  ).toBeVisible();
  await employmentSection.locator("summary").click();
  await employmentSection
    .getByRole("button", { name: "Edit Employer letter" })
    .click();
  dialog = page.getByRole("dialog", { name: "Edit Employer letter" });
  await expect(dialog.getByLabel("Document name")).toHaveValue(
    "Employer letter",
  );
  await expect(dialog.getByLabel("Replacement file (optional)")).toBeVisible();
  await dialog.getByLabel("Document name").fill("Updated employer letter");
  await dialog.getByRole("button", { name: "Save changes" }).click();
  await expect(dialog).not.toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Updated employer letter" }),
  ).toBeVisible();

  await employmentSection.locator("summary").click();
  await employmentSection
    .getByRole("button", { name: "Add employment contract" })
    .click();
  dialog = page.getByRole("dialog", { name: "Add Employment contract" });
  await expect(dialog).toBeVisible();
  await dialog.getByLabel("Document file").setInputFiles({
    name: "employment-contract.png",
    mimeType: "image/png",
    buffer: tinyPng,
  });
  await dialog.getByLabel("Document name").fill("Employment contract");
  await dialog
    .getByRole("button", { name: "Encrypt and save document" })
    .click();

  await expect(
    employmentSection.getByText("Complete", { exact: true }),
  ).toBeVisible();
  const documentCollection = page.getByLabel("Document collection");
  await expect(
    documentCollection.getByRole("heading", {
      name: "Updated employer letter",
    }),
  ).toBeVisible();
  await expect(
    documentCollection.getByRole("heading", { name: "Employment contract" }),
  ).toBeVisible();
});

test("resets local data safely when the PIN is forgotten", async ({ page }) => {
  await page.goto("/");
  await createLocalProfile(page);
  await page.getByRole("button", { name: "Lock app" }).click();

  await expect(page.getByRole("button", { name: "Forgot PIN?" })).toBeVisible();
  await page.getByRole("button", { name: "Forgot PIN?" }).click();
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

test("manages the local profile and encrypted backups", async ({ page }) => {
  await page.goto("/");
  await createLocalProfile(page);

  await expect(page.getByText("On this device", { exact: true })).toHaveCount(
    0,
  );
  await page.getByRole("link", { name: "Profile", exact: true }).click();

  await expect(
    page.getByRole("heading", { name: "Profile & settings" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Household profiles", level: 2 }),
  ).toBeVisible();
  await expect(page.getByText("1 person", { exact: true })).toBeVisible();
  await expect(
    page.getByText("Encrypted locally", { exact: true }),
  ).toBeVisible();

  await page.getByText("Protect this device", { exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Stored only on this device" }),
  ).toBeVisible();

  await expect(
    page.getByRole("heading", { name: "Install and updates" }),
  ).toHaveCount(0);
  await page.getByText("Backup and restore", { exact: true }).click();
  await page.getByRole("button", { name: "Create encrypted backup" }).click();
  await expect(
    page.getByRole("dialog", { name: "Create a backup" }),
  ).toHaveClass(/liquid-dialog/);
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
  expect(backup.dataSchemaVersion).toBe(7);
  expect(backupText).not.toContain(TEST_PROFILE.name);
  await expect(
    page.getByText("Encrypted backup downloaded", { exact: false }),
  ).toBeVisible();

  await page.getByRole("link", { name: "Family", exact: true }).click();
  await page.getByRole("button", { name: "Add Household Member" }).click();
  await page.getByLabel("Full name").fill("Temporary Family Member");
  await page.getByLabel("Date of birth").fill("2005-06-15");
  await page.getByLabel("Immigration role").selectOption("not-set");
  await page.getByRole("button", { name: "Save household member" }).click();
  await expect(
    page.getByRole("button", { name: "Edit Temporary Family Member" }),
  ).toBeVisible();

  await page.getByRole("link", { name: "Vault", exact: true }).first().click();
  await page
    .getByRole("button", { name: `Show ${TEST_PROFILE.name}'s documents` })
    .click();
  await page.getByRole("heading", { name: "Employment", exact: true }).click();
  await page
    .getByRole("button", { name: "Add Employer letter", exact: true })
    .click();
  const postBackupDocumentDialog = page.getByRole("dialog", {
    name: "Add Employer letter",
  });
  await postBackupDocumentDialog.getByLabel("Document file").setInputFiles({
    name: "post-backup.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
      "base64",
    ),
  });
  await postBackupDocumentDialog
    .getByLabel("Document name")
    .fill("Created after backup");
  await postBackupDocumentDialog
    .getByRole("button", { name: "Encrypt and save document" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Created after backup" }),
  ).toBeVisible();

  await page.getByRole("link", { name: "Profile", exact: true }).click();
  await page.getByText("Backup and restore", { exact: true }).click();
  await page.getByRole("button", { name: "Restore encrypted backup" }).click();
  await expect(
    page.getByRole("dialog", { name: "Restore a backup" }),
  ).toHaveClass(/liquid-dialog/);
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
  ).toBeAttached();
  await page.getByRole("link", { name: "Family", exact: true }).click();
  await expect(
    page.getByRole("button", { name: `Edit ${TEST_PROFILE.name}` }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Edit Temporary Family Member" }),
  ).toHaveCount(0);
  await page.getByRole("link", { name: "Vault", exact: true }).first().click();
  await expect(
    page.getByRole("heading", { name: "Created after backup" }),
  ).toHaveCount(0);
  await page.getByRole("link", { name: "Profile", exact: true }).click();

  await page.getByRole("button", { name: "View legal information" }).click();
  await expect(
    page.getByRole("heading", { name: "Terms and privacy" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Back" }).click();
  await expect(
    page.getByRole("heading", { name: "Profile & settings" }),
  ).toBeVisible();

  await page.getByText("Protect this device", { exact: true }).click();
  await page.getByRole("button", { name: "Lock now" }).click();
  await expect(
    page.getByRole("heading", { name: "Enter Security PIN" }),
  ).toBeVisible();
});

test("keeps profile settings sections collapsed until requested", async ({
  page,
}) => {
  await page.goto("/");
  await createLocalProfile(page);
  await page.getByRole("link", { name: "Profile", exact: true }).click();

  const sections = [
    "Protect this device",
    "Backup and restore",
    "Delete all local data",
  ];

  for (const heading of sections) {
    const details = page.locator("details").filter({ hasText: heading });
    await expect(details).not.toHaveAttribute("open", "");
  }

  await expect(
    page.getByRole("heading", { name: "Appearance", level: 2 }),
  ).toBeVisible();
  await expect(page.getByRole("group", { name: "Appearance" })).toBeVisible();
  await expect(
    page.getByRole("heading", {
      name: "Terms, privacy, and licence",
      level: 2,
    }),
  ).toBeVisible();
  await expect(page.getByRole("radio", { name: "System" })).toBeVisible();
  await expect(page.locator("#open-install-settings")).toHaveCount(0);
});

test("animates expandable sections when opening and closing", async ({
  page,
}) => {
  await page.goto("/");
  await createLocalProfile(page);
  await page.getByRole("link", { name: "Profile", exact: true }).click();

  const settingsDetails = page
    .locator("details")
    .filter({ hasText: "Protect this device" });

  const openAnimationIds = await settingsDetails.evaluate((element) => {
    const summary = element.querySelector<HTMLElement>(":scope > summary");
    summary?.click();
    return element.getAnimations().map((animation) => animation.id);
  });

  expect(openAnimationIds).toContain("urbanfox-disclosure");
  await expect(settingsDetails).toHaveAttribute("open", "");
  await expect(settingsDetails).not.toHaveAttribute(
    "data-disclosure-animating",
    "true",
  );

  const closeAnimationIds = await settingsDetails.evaluate((element) => {
    const summary = element.querySelector<HTMLElement>(":scope > summary");
    summary?.click();
    return element.getAnimations().map((animation) => animation.id);
  });

  expect(closeAnimationIds).toContain("urbanfox-disclosure");
  await expect(settingsDetails).not.toHaveAttribute("open", "");

  await page.getByRole("link", { name: "Vault", exact: true }).click();

  const vaultDetails = page.locator("details.vault-section-card").first();
  await expect(vaultDetails).toBeVisible();

  const vaultAnimationIds = await vaultDetails.evaluate((element) => {
    const summary = element.querySelector<HTMLElement>(":scope > summary");
    summary?.click();
    return element.getAnimations().map((animation) => animation.id);
  });

  expect(vaultAnimationIds).toContain("urbanfox-disclosure");
});

test("uses a three-state sliding appearance toggle and persists preferences", async ({
  page,
}) => {
  await page.goto("/");
  await createLocalProfile(page);
  await page.getByRole("link", { name: "Profile", exact: true }).click();

  const toggle = page.locator(".appearance-toggle-track");
  const thumb = page.locator(".appearance-toggle-thumb");
  const light = page.getByRole("radio", { name: "Light" });
  await expect(light).toBeChecked();
  await expect(toggle).toHaveCSS("--appearance-index", "2");

  await page.getByText("Dark", { exact: true }).click();
  await expect(toggle).toHaveCSS("--appearance-index", "0");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await expect(thumb).toHaveCSS("background-image", /linear-gradient/);
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem("urbanfox-theme")))
    .toBe("dark");

  await page.getByRole("link", { name: "Family", exact: true }).click();
  await page.getByRole("button", { name: `Edit ${TEST_PROFILE.name}` }).click();
  await expect(page.locator(".member-profile-dialog")).toHaveCSS(
    "background-color",
    "rgba(39, 24, 59, 0.88)",
  );
  await expect(page.getByLabel("Full name")).toHaveCSS(
    "background-color",
    "rgba(21, 6, 41, 0.72)",
  );
  await expect(page.getByLabel("Date of birth")).toHaveCSS(
    "background-color",
    "rgba(21, 6, 41, 0.72)",
  );
  await expect(page.getByLabel("Immigration role")).toHaveCSS(
    "appearance",
    "none",
  );
  await expect(page.getByLabel("Date of birth")).toHaveCSS(
    "border-radius",
    "16px",
  );
  await expect(page.getByLabel("Immigration role")).toHaveCSS(
    "border-radius",
    "16px",
  );
  await expect(page.getByLabel("Immigration role")).toHaveCSS(
    "background-image",
    "none",
  );
  const memberControlHeights = await page.evaluate(() => {
    const ids = [
      "family-full-name",
      "family-date-of-birth",
      "family-immigration-role",
    ];
    return ids.map(
      (id) => document.getElementById(id)?.getBoundingClientRect().height ?? 0,
    );
  });
  expect(
    Math.max(...memberControlHeights) - Math.min(...memberControlHeights),
  ).toBeLessThanOrEqual(1);
  await page.getByRole("button", { name: "Close family form" }).click();
  await page.getByRole("link", { name: "Profile", exact: true }).click();

  await page.getByText("System", { exact: true }).click();
  await expect(toggle).toHaveCSS("--appearance-index", "1");
  await expect
    .poll(() => page.evaluate(() => localStorage.getItem("urbanfox-theme")))
    .toBe("system");

  await page.getByText("Light", { exact: true }).click();
  await expect(toggle).toHaveCSS("--appearance-index", "2");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");

  await page.reload();
  await enterPin(page, "Four-digit PIN", TEST_PROFILE.pin);
  await page.getByRole("link", { name: "Profile", exact: true }).click();
  await expect(page.getByRole("radio", { name: "Light" })).toBeChecked();
});

test("permanently deletes all local application data", async ({ page }) => {
  await page.goto("/");
  await createLocalProfile(page);
  await page.getByRole("link", { name: "Profile", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Delete all local data" }),
  ).toBeVisible();
  await page
    .getByText("Delete all local data", { exact: true })
    .first()
    .click();
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
      const request = indexedDB.open("urbanfox-ilr", 8);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const storeNames = [
      "security",
      "profiles",
      "permissions",
      "trips",
      "documents",
    ];
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
  expect(localData).toEqual({
    counts: [0, 0, 0, 0, 0],
    termsAcceptance: null,
  });

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
  await expect(
    page.getByRole("heading", { name: "Family Overview" }),
  ).toBeVisible();
  await expect(
    page.getByText("Household profiles", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Immigration roles set", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Selected profile check" }),
  ).toHaveCount(0);
  await expect(page.getByText("Official-rule residence tracker")).toHaveCount(
    0,
  );
  await expect(page.getByText("Selected tracking profile")).toHaveCount(0);
  await expect(page.getByText("Edit", { exact: true })).toHaveCount(0);
  await expect(page.locator(".dashboard-person-progress")).toHaveCount(0);
  await page.getByRole("button", { name: "Add Household Member" }).click();

  await expect(
    page.getByRole("heading", { name: "Your household" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("heading", { name: "Add household member" }),
  ).toBeVisible();
  await expect(
    page.getByRole("dialog", { name: "Add household member" }),
  ).toHaveClass(/liquid-dialog/);
  await expect(page.locator(".member-profile-header")).toBeVisible();
  await expect(
    page
      .getByRole("dialog", { name: "Add household member" })
      .locator(".liquid-dialog-icon"),
  ).toBeVisible();
  await expect(page.locator(".member-profile-save")).toHaveCSS(
    "background-image",
    /linear-gradient/,
  );
  await page.getByLabel("Full name").fill("Freddy Test Dependant");
  await page.getByLabel("Date of birth").fill("2005-06-15");
  await page.getByLabel("Immigration role").selectOption("dependant");
  await page.getByRole("button", { name: "Save household member" }).click();

  await expect(
    page.getByRole("heading", { name: "Family Overview" }),
  ).toBeVisible();
  await expect(page.getByText("2 of 2", { exact: true })).toBeVisible();
  const membersRegion = page.getByRole("region", { name: "Active members" });
  const membersBox = await membersRegion.boundingBox();
  const addBox = await page
    .getByRole("button", { name: "Add Household Member" })
    .boundingBox();
  expect(membersBox).not.toBeNull();
  expect(addBox).not.toBeNull();
  expect(addBox!.y).toBeGreaterThanOrEqual(membersBox!.y + membersBox!.height);
  const editFamilyMember = page.getByRole("button", {
    name: "Edit Freddy Test Dependant",
  });
  await expect(editFamilyMember).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await editFamilyMember.click();
  const editDialog = page.getByRole("dialog", {
    name: "Edit household member",
  });
  await expect(editDialog).toHaveCSS("position", "fixed");
  const dialogBox = await editDialog.boundingBox();
  const viewport = page.viewportSize();
  expect(dialogBox).not.toBeNull();
  expect(viewport).not.toBeNull();
  expect(dialogBox?.y ?? -1).toBeGreaterThanOrEqual(0);
  expect((dialogBox?.y ?? 0) + (dialogBox?.height ?? 0)).toBeLessThanOrEqual(
    viewport?.height ?? 0,
  );
  await expect(
    page.getByRole("heading", { name: "Edit household member" }),
  ).toBeVisible();
  await expect(page.getByLabel("Full name")).toHaveValue(
    "Freddy Test Dependant",
  );
  const storedFamily = await page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("urbanfox-ilr", 8);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    return new Promise<string>((resolve, reject) => {
      const request = database
        .transaction("profiles", "readonly")
        .objectStore("profiles")
        .get("household-members");
      request.onsuccess = () => resolve(JSON.stringify(request.result));
      request.onerror = () => reject(request.error);
    });
  });
  expect(storedFamily).not.toContain("Freddy Test Dependant");
  expect(storedFamily).toContain("ciphertext");

  await page.getByLabel("Full name").fill("Freddy Test Child");
  await page.getByRole("button", { name: "Save household member" }).click();
  await expect(
    page.getByRole("button", { name: "Edit Freddy Test Child" }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Lock app" }).click();
  await enterPin(page, "Four-digit PIN", TEST_PROFILE.pin);
  await page.getByRole("link", { name: "Family", exact: true }).first().click();
  await expect(
    page.getByRole("button", { name: "Edit Freddy Test Child" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Edit Freddy Test Child" }).click();

  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Delete Freddy Test Child" }).click();
  await expect(
    page.getByRole("button", { name: `Edit ${TEST_PROFILE.name}` }),
  ).toBeVisible();
});

test("tracks encrypted immigration permissions without claiming eligibility", async ({
  page,
}) => {
  await page.goto("/");
  await createLocalProfile(page);
  await page.getByRole("link", { name: "ILR", exact: true }).click();
  await page.getByRole("button", { name: "+ Add past visa" }).click();
  await expect(
    page.getByRole("heading", { name: "Immigration history" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Permission timeline" }),
  ).toBeVisible();
  await expect(page.locator("#permission-count")).toHaveText("0");
  await expect(page.locator(".permission-summary-date")).toHaveText(
    "Not recorded",
  );
  await expect(page.getByText("No permissions recorded")).toBeVisible();
  await page.getByRole("button", { name: "Add permission" }).click();
  await expect(
    page.getByRole("dialog", { name: "Add immigration permission" }),
  ).toHaveClass(/liquid-dialog/);
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
  await expect(
    page.getByText("Calculation supported", { exact: true }),
  ).toBeVisible();
  await expect(page.locator("#permission-count")).toHaveText("1");
  await expect(page.locator(".permission-summary-date")).toHaveText(
    "2026-12-31",
  );
  await expect(page.getByText(/qualifying period on Dashboard/i)).toBeVisible();
  const permissionProfileId = await page
    .getByLabel("Tracking profile")
    .inputValue();
  const storedPermission = await page.evaluate(async (profileId) => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("urbanfox-ilr", 8);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    return new Promise<string>((resolve, reject) => {
      const request = database
        .transaction("permissions", "readonly")
        .objectStore("permissions")
        .get(profileId);
      request.onsuccess = () => resolve(JSON.stringify(request.result));
      request.onerror = () => reject(request.error);
    });
  }, permissionProfileId);
  expect(storedPermission).not.toContain("skilled-worker");
  expect(storedPermission).toContain("ciphertext");

  await page.getByRole("button", { name: "Edit Skilled Worker" }).click();
  await page.getByLabel(/Visa grant date/).clear();
  await page.getByLabel("Permission expiry date").fill("2027-12-31");
  await page.getByRole("button", { name: "Save permission" }).click();
  await expect(
    page.getByText("Review required", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText("Add the visa grant date", { exact: false }),
  ).toBeVisible();
  await expect(page.locator(".permission-summary-date")).toHaveText(
    "2027-12-31",
  );

  await page.getByRole("button", { name: "Lock app" }).click();
  await enterPin(page, "Four-digit PIN", TEST_PROFILE.pin);
  await page.getByRole("link", { name: "Family", exact: true }).first().click();
  await page.getByRole("link", { name: "ILR", exact: true }).click();
  await page.getByRole("button", { name: "+ Add past visa" }).click();
  await expect(page.locator(".permission-summary-date")).toHaveText(
    "2027-12-31",
  );

  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Delete Skilled Worker" }).click();
  await expect(page.getByText("No permissions recorded")).toBeVisible();
});

test("shows a separate estimate for a household member who is a Skilled Worker dependant", async ({
  page,
}) => {
  await page.goto("/");
  await createLocalProfile(page);
  await expect(
    page.getByRole("button", { name: `Edit ${TEST_PROFILE.name}` }),
  ).toBeVisible();
  await page.getByRole("link", { name: "ILR", exact: true }).click();
  await page.getByRole("button", { name: "+ Add past visa" }).click();
  await page.getByRole("button", { name: "Add permission" }).click();
  await page.getByLabel("Immigration route").selectOption("skilled-worker");
  await page.getByLabel("Permission held as").selectOption("dependant");
  await page.getByLabel(/Visa grant date/).fill("2023-12-15");
  await page.getByLabel("Permission start date").fill("2023-12-15");
  await page.getByLabel("Permission expiry date").fill("2029-12-31");
  await page.getByLabel("Actual UK arrival date").fill("2024-01-15");
  await page.getByRole("button", { name: "Save permission" }).click();
  await expect(
    page.getByText("Dependant calculation supported", { exact: true }),
  ).toBeVisible();

  await page.getByRole("link", { name: "ILR", exact: true }).click();
  await expect(page.getByText("17 Nov 2028", { exact: true })).toBeVisible();
  await expect(
    page.getByText("Dependant permission", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("31 / 180 days", { exact: true })).toBeVisible();
});

test("tracks encrypted trips, open travel, and overlap warnings", async ({
  page,
}) => {
  await page.goto("/");
  await createLocalProfile(page);
  await page.getByRole("link", { name: "Travel", exact: true }).click();

  await expect(
    page.getByRole("heading", { name: "Travel & Absences" }),
  ).toBeVisible();
  await expect(
    page.getByRole("progressbar", { name: "Recorded rolling absence usage" }),
  ).toBeVisible();
  await expect(page.getByText("Recorded travel")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Trip history", exact: true }),
  ).toBeVisible();
  await expect(page.getByText("No trips recorded")).toBeVisible();
  await page.getByRole("button", { name: "Add trip" }).click();
  await expect(page.getByRole("dialog", { name: "Add trip" })).toHaveClass(
    /liquid-dialog/,
  );
  await page.evaluate(() =>
    document.documentElement.setAttribute("data-theme", "dark"),
  );
  await expect(page.locator(".trip-profile-dialog")).toHaveCSS(
    "background-color",
    "rgba(39, 24, 59, 0.88)",
  );
  await expect(page.locator(".trip-profile-form")).toHaveCSS(
    "overflow-y",
    "auto",
  );
  await expect(page.getByLabel("Destination")).toHaveCSS(
    "box-sizing",
    "border-box",
  );
  const tripFieldWidths = await page.evaluate(() => {
    const ids = [
      "trip-departure",
      "trip-return",
      "trip-destination",
      "trip-notes",
    ];
    return ids.map((id) =>
      Math.round(
        document.getElementById(id)?.getBoundingClientRect().width ?? 0,
      ),
    );
  });
  expect(new Set(tripFieldWidths).size).toBe(1);
  expect(tripFieldWidths[0]).toBeGreaterThan(0);
  await page.getByLabel("UK departure date").fill("2024-02-01");
  await page.getByLabel(/UK return date/).fill("2024-02-10");
  await page.getByLabel("Destination").fill("India");
  await page.getByLabel(/Notes/).fill("Family visit");
  await page.getByLabel("Flag for manual review").check();
  await page.getByRole("button", { name: "Save trip" }).click();

  await expect(
    page.getByRole("heading", { name: "India", level: 3 }),
  ).toBeVisible();
  await expect(page.getByText("Manual review", { exact: true })).toBeVisible();
  await expect(page.getByText("8 Days", { exact: true })).toBeVisible();
  const storedTrip = await page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("urbanfox-ilr", 8);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    return new Promise<string>((resolve, reject) => {
      const request = database
        .transaction("trips", "readonly")
        .objectStore("trips")
        .getAll();
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
  await expect(page.getByText(/12 Feb 2024/)).toBeVisible();

  await page.getByRole("button", { name: "Add trip" }).click();
  await page.getByLabel("UK departure date").fill("2025-01-01");
  await page.getByLabel("Destination").fill("Canada");
  await page.getByRole("button", { name: "Save trip" }).click();
  await expect(page.getByText("Open trip", { exact: true })).toBeVisible();
  await expect(page.getByText(/Still away/)).toBeVisible();

  await page.getByRole("button", { name: "2024", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Canada", level: 3 }),
  ).toBeHidden();
  await expect(
    page.getByRole("heading", { name: "India", level: 3 }),
  ).toBeVisible();
  await page.getByRole("button", { name: "All years", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Canada", level: 3 }),
  ).toBeVisible();

  await page.getByRole("button", { name: "Lock app" }).click();
  await enterPin(page, "Four-digit PIN", TEST_PROFILE.pin);
  await page.getByRole("link", { name: "Travel", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Canada", level: 3 }),
  ).toBeVisible();

  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Delete trip to Canada" }).click();
  await expect(
    page.getByRole("heading", { name: "Canada", level: 3 }),
  ).toHaveCount(0);
});

test("shows recorded-absence usage on ILR and Travel without claiming eligibility", async ({
  page,
}) => {
  await page.goto("/");
  await createLocalProfile(page);
  await page.getByRole("link", { name: "ILR", exact: true }).click();
  await page.getByRole("button", { name: "+ Add past visa" }).click();
  await page.getByRole("button", { name: "Add permission" }).click();
  await page.getByLabel("Immigration route").selectOption("skilled-worker");
  await page.getByLabel("Permission held as").selectOption("main-applicant");
  await page.getByLabel(/Visa grant date/).fill("2022-01-01");
  await page.getByLabel("Permission start date").fill("2022-01-01");
  await page.getByLabel("Permission expiry date").fill("2028-01-01");
  await page.getByLabel("Actual UK arrival date").fill("2022-01-01");
  await page.getByRole("button", { name: "Save permission" }).click();
  await page.getByRole("link", { name: "Travel", exact: true }).click();
  await page.getByRole("button", { name: "Add trip" }).click();
  await page.getByLabel("UK departure date").fill("2024-01-01");
  await page.getByLabel(/UK return date/).fill("2024-07-01");
  await page.getByLabel("Destination").fill("Test destination");
  await page.getByRole("button", { name: "Save trip" }).click();
  await expect(
    page.getByText("Recorded history may exceed the rolling 180-day limit."),
  ).toBeVisible();
  await expect(
    page.getByRole("progressbar", { name: "Recorded rolling absence usage" }),
  ).toHaveAttribute("aria-valuetext", "181 / 180 days used");
  await expect(
    page.getByRole("heading", { name: "Tracking only—not legal advice" }),
  ).toBeVisible();
  await page.getByRole("link", { name: "ILR", exact: true }).click();
  await expect(page.getByText("181 / 180 days", { exact: true })).toBeVisible();
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
    const activeLink = element.querySelector<HTMLElement>(
      'a[aria-current="page"]',
    );
    const activeIcon = activeLink?.querySelector<SVGElement>("svg");
    const indicator = element.querySelector<HTMLElement>(
      ".mobile-navigation-indicator",
    );
    const indicatorStyle = indicator
      ? window.getComputedStyle(indicator)
      : undefined;
    const iconStyle = activeIcon
      ? window.getComputedStyle(activeIcon)
      : undefined;
    return {
      background: style.backgroundColor,
      borderRadius: style.borderRadius,
      indicatorRadius: indicatorStyle?.borderRadius ?? "",
      indicatorTransition: indicatorStyle?.transitionDuration ?? "",
      iconWidth: iconStyle?.width ?? "",
    };
  });

  expect(navigationBox).not.toBeNull();
  expect(navigationBox?.x).toBeGreaterThan(0);
  expect(navigationBox?.width).toBeLessThan(viewport.width);
  expect((navigationBox?.y ?? 0) + (navigationBox?.height ?? 0)).toBeLessThan(
    viewport.height,
  );
  expect(navigationStyles.background).toBe("rgba(255, 247, 255, 0.78)");
  expect(navigationStyles.borderRadius).toBe("999px");
  expect(navigationStyles.indicatorRadius).toBe("999px");
  expect(navigationStyles.indicatorTransition).toBe("0.38s");
  expect(navigationStyles.iconWidth).toBe("28px");
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
    "rgba(255, 247, 255, 0.68)",
  );

  const compactNavigationBox = await navigation.boundingBox();
  const compactNavigationBackground = await navigation.evaluate(
    (element) => window.getComputedStyle(element).backgroundColor,
  );
  const scrolledHeaderBox = await header.boundingBox();

  expect(compactNavigationBox?.width).toBeLessThan(navigationBox?.width ?? 0);
  expect(compactNavigationBox?.height).toBeLessThan(navigationBox?.height ?? 0);
  expect(compactNavigationBackground).toBe("rgba(255, 247, 255, 0.68)");
  expect(scrolledHeaderBox?.y).toBeLessThanOrEqual(1);
});

test("opens the centre ILR hero journey for the household", async ({
  page,
}, testInfo) => {
  await page.goto("/");
  await createLocalProfile(page);

  const navigation = page.getByRole("navigation", {
    name: "Primary navigation",
  });
  const indicator = navigation.locator(".mobile-navigation-indicator");
  const beforeHeroBackground =
    testInfo.project.name === "mobile-chromium"
      ? await indicator.evaluate(
          (element) => window.getComputedStyle(element).backgroundImage,
        )
      : null;

  const ilrLinks = page.getByRole("link", { name: "ILR", exact: true });
  await expect(ilrLinks.first()).toBeVisible();
  await page.evaluate(() =>
    document.documentElement.setAttribute("data-theme", "dark"),
  );
  await expect(
    navigation.locator('a[data-navigation="ILR"]:not([aria-current="page"])'),
  ).toHaveCSS("color", "rgb(238, 9, 121)");
  expect(
    await navigation
      .locator(
        'a[data-navigation="ILR"]:not([aria-current="page"]) .navigation-hero-icon',
      )
      .evaluate((element) => window.getComputedStyle(element).stroke),
  ).toContain(
    testInfo.project.name === "mobile-chromium"
      ? "mobile-ilr-icon-gradient"
      : "desktop-ilr-icon-gradient",
  );
  await ilrLinks.first().click();

  await expect(navigation).toHaveClass(/is-hero-active/);
  await expect(navigation.locator('a[data-navigation="ILR"]')).toHaveAttribute(
    "aria-current",
    "page",
  );
  if (beforeHeroBackground) {
    await expect
      .poll(() =>
        indicator.evaluate(
          (element) => window.getComputedStyle(element).backgroundImage,
        ),
      )
      .not.toBe(beforeHeroBackground);
  }
  await expect(navigation.locator('a[data-navigation="ILR"]')).toHaveCSS(
    "color",
    "rgb(255, 255, 255)",
  );

  if (testInfo.project.name === "mobile-chromium") {
    const navigationBox = await navigation.boundingBox();
    const indicatorBox = await indicator.boundingBox();
    expect(navigationBox).not.toBeNull();
    expect(indicatorBox).not.toBeNull();
    expect(navigationBox?.height ?? 0).toBeLessThanOrEqual(72);
    expect(indicatorBox?.width ?? 0).toBeGreaterThan(indicatorBox?.height ?? 0);
  }

  await expect(
    page.getByRole("heading", { name: "Permission not recorded" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "ILR milestone track" }),
  ).toBeVisible();
  await expect(
    page.getByRole("button", {
      name: `Show ${TEST_PROFILE.name}'s ILR journey`,
    }),
  ).toBeVisible();
  await expect(page.getByText("Setup incomplete")).toBeVisible();
  await expect(page.getByText("Not available yet").first()).toBeVisible();
});

test("glides the active mobile navigation capsule between sections", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "mobile-chromium");
  await page.goto("/");
  await createLocalProfile(page);

  const navigation = page.getByRole("navigation", {
    name: "Primary navigation",
  });
  const indicator = navigation.locator(".mobile-navigation-indicator");
  await expect(indicator).toHaveCount(1);

  const initialTransform = await indicator.evaluate(
    (element) => window.getComputedStyle(element).transform,
  );
  await page.getByRole("link", { name: "Travel", exact: true }).click();
  const tripsLink = navigation.locator('a[data-navigation="Trips"]');
  await expect(tripsLink).toHaveAttribute("aria-current", "page");
  await expect(tripsLink).toHaveCSS("color", "rgb(182, 0, 90)");
  await expect
    .poll(() =>
      navigation.evaluate((element) =>
        element.style.getPropertyValue("--mobile-navigation-offset"),
      ),
    )
    .toBe("100%");

  await expect
    .poll(() =>
      indicator.evaluate(
        (element) => window.getComputedStyle(element).transform,
      ),
    )
    .not.toBe(initialTransform);

  await page.getByRole("link", { name: "ILR", exact: true }).first().click();
  await expect
    .poll(() =>
      page
        .getByRole("navigation", { name: "Primary navigation" })
        .evaluate((element) =>
          element.style.getPropertyValue("--mobile-navigation-offset"),
        ),
    )
    .toBe("200%");
});

test("uses a centered website layout on desktop", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop-chromium");
  await page.goto("/");
  await createLocalProfile(page);

  const mainBox = await page.getByRole("main").boundingBox();
  const navigationBox = await page
    .getByRole("navigation", { name: "Primary navigation" })
    .boundingBox();

  expect(mainBox).not.toBeNull();
  expect(navigationBox).not.toBeNull();
  expect(mainBox?.width).toBe(768);
  expect(navigationBox?.y).toBeLessThan(mainBox?.y ?? 0);
  expect(navigationBox?.height).toBeLessThanOrEqual(64);
  await expect(page.locator(".top-bar")).toHaveCSS("position", "sticky");
  await expect(
    page
      .getByRole("navigation", { name: "Primary navigation" })
      .getByText("Family", { exact: true }),
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

test("keeps an authenticated session open across temporary system UI", async ({
  page,
}) => {
  await page.goto("/");
  await createLocalProfile(page);
  await page.getByRole("link", { name: "Vault" }).first().click();

  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "hidden",
    });
    document.dispatchEvent(new Event("visibilitychange"));
    Object.defineProperty(document, "visibilityState", {
      configurable: true,
      value: "visible",
    });
    document.dispatchEvent(new Event("visibilitychange"));
  });

  await expect(
    page.getByRole("heading", {
      name: "Evidence readiness",
      exact: true,
      level: 1,
    }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: /Enter PIN/i })).toHaveCount(
    0,
  );
});

test("restarts the app after downloading an available update", async ({
  page,
}) => {
  await page.addInitScript(() => {
    const originalFetch = window.fetch.bind(window);
    window.fetch = async (input, init) => {
      const url =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.toString()
            : input.url;
      if (url.includes("release.json?check="))
        return new Response(
          JSON.stringify({
            version: "9.9.9",
            notes: ["Test update"],
          }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          },
        );
      return originalFetch(input, init);
    };

    const serviceWorker = navigator.serviceWorker;
    Object.defineProperty(serviceWorker, "getRegistration", {
      configurable: true,
      value: async () => ({
        update: async () => undefined,
      }),
    });
  });

  await page.goto("/");
  await createLocalProfile(page);

  const updateTrigger = page.getByRole("button", {
    name: "Update 9.9.9 available",
  });
  await expect(updateTrigger).toBeVisible();
  await updateTrigger.click();

  const dialog = page.getByRole("dialog", { name: "Install and updates" });
  await expect(dialog.getByText("Update 9.9.9 available")).toBeVisible();
  const restart = page.waitForEvent(
    "framenavigated",
    (frame) => frame === page.mainFrame(),
  );
  await dialog.getByRole("button", { name: "Download update" }).click();

  await restart;
  await page.waitForLoadState("domcontentloaded");
  await expect(dialog).not.toBeVisible();
});

async function readCohortSpacing(page: import("@playwright/test").Page) {
  return page
    .getByRole("region", { name: "Household cohort", exact: true })
    .evaluate((cohort) => {
      const main = cohort.closest("main")!;
      const card = main
        .querySelector('[role="progressbar"]')!
        .closest("section")!;
      const style = getComputedStyle(main);
      const mainBox = main.getBoundingClientRect();
      const cohortBox = cohort.getBoundingClientRect();
      const cardBox = card.getBoundingClientRect();
      return {
        sectionGap: Math.round((cardBox.top - cohortBox.bottom) * 100) / 100,
        topGap: Math.round((cohortBox.top - mainBox.top) * 100) / 100,
        padding: style.padding,
        rowGap: style.rowGap,
        width: Math.round(mainBox.width * 100) / 100,
      };
    });
}

test("shares household selection and progress styling across ILR, Vault, and Travel", async ({
  page,
}) => {
  await page.goto("/");
  await createLocalProfile(page);
  const otherName = "Freddy Second Profile";
  await page.getByRole("button", { name: "Add Household Member" }).click();
  await page.getByLabel("Full name").fill(otherName);
  await page.getByLabel("Date of birth").fill("2005-06-15");
  await page.getByLabel("Immigration role").selectOption("dependant");
  await page.getByRole("button", { name: "Save household member" }).click();
  await expect(
    page.getByRole("button", { name: `Edit ${otherName}` }),
  ).toBeVisible();
  await page.getByRole("link", { name: "Vault", exact: true }).first().click();
  const ownerPill = page.getByRole("button", {
    name: `Show ${TEST_PROFILE.name}'s documents`,
  });
  const otherPill = page.getByRole("button", {
    name: `Show ${otherName}'s documents`,
  });
  await ownerPill.click();
  await expect(ownerPill).toHaveAttribute("aria-pressed", "true");
  await expect(
    page.getByRole("progressbar", { name: "Document Vault readiness" }),
  ).toHaveAttribute("aria-valuenow", "0");
  await page.getByText("Life in the UK & English", { exact: true }).click();
  await page
    .getByRole("button", { name: "Add Life in the UK evidence" })
    .click();
  const lifeDialog = page.getByRole("dialog", {
    name: "Add Life in the UK evidence",
  });
  await lifeDialog.getByLabel("Status").selectOption("exempt");
  await lifeDialog.getByRole("button", { name: "Save", exact: true }).click();
  await expect(lifeDialog).not.toBeVisible();
  await expect(ownerPill).toContainText("0%");
  await page.getByRole("heading", { name: "Employment", exact: true }).click();
  await page
    .getByRole("button", { name: "Add Employer letter", exact: true })
    .click();
  const employmentDialog = page.getByRole("dialog", {
    name: "Add Employer letter",
  });
  await employmentDialog.getByLabel("Document file").setInputFiles({
    name: "owner-letter.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
      "base64",
    ),
  });
  await employmentDialog
    .getByLabel("Document name")
    .fill("Owner employment evidence");
  await employmentDialog
    .getByRole("button", { name: "Encrypt and save document" })
    .click();
  await expect(employmentDialog).not.toBeVisible();
  await expect(ownerPill).toContainText("20%");
  await expect(otherPill).toContainText("0%");
  await expect(
    page.getByRole("progressbar", { name: "Document Vault readiness" }),
  ).toHaveAttribute("aria-valuenow", "20");
  // Keyboard selection must show only the selected person's evidence and progress.
  await otherPill.focus();
  await otherPill.press("Enter");
  await expect(otherPill).toHaveAttribute("aria-pressed", "true");
  await expect(ownerPill).toHaveAttribute("aria-pressed", "false");
  await expect(
    page.getByRole("heading", { name: "Owner employment evidence" }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("progressbar", { name: "Document Vault readiness" }),
  ).toHaveAttribute("aria-valuenow", "0");
  await page.getByText("Life in the UK & English", { exact: true }).click();
  await expect(
    page.getByRole("button", { name: "Add Life in the UK evidence" }),
  ).toBeVisible();
  for (const theme of ["light", "dark"]) {
    await page.evaluate(
      (value) => document.documentElement.setAttribute("data-theme", value),
      theme,
    );
    const vaultSpacing = await readCohortSpacing(page);
    expect(vaultSpacing.sectionGap).toBeGreaterThan(0);
    const vaultCard = page.getByRole("region", { name: "Evidence readiness" });
    const vaultStyle = await vaultCard.evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        background: style.backgroundColor,
        border: style.borderRadius,
        color: style.color,
      };
    });
    const vaultPillStyle = await otherPill.evaluate((element) => {
      const style = getComputedStyle(element);
      return {
        background: style.backgroundImage,
        border: style.borderRadius,
        color: style.color,
      };
    });
    await page.getByRole("link", { name: "ILR", exact: true }).first().click();
    const journeyPill = page.getByRole("button", {
      name: `Show ${otherName}'s ILR journey`,
    });
    await expect(journeyPill).toHaveAttribute("aria-pressed", "true");
    const ilrSpacing = await readCohortSpacing(page);
    const layoutDetails =
      ilrSpacing.sectionGap === vaultSpacing.sectionGap
        ? ""
        : await page.getByRole("main").evaluate((main) =>
            JSON.stringify(
              [...main.children].map((child) => {
                const style = getComputedStyle(child);
                const box = child.getBoundingClientRect();
                return {
                  tag: child.tagName,
                  className: child.className,
                  top: box.top,
                  bottom: box.bottom,
                  position: style.position,
                  margin: style.margin,
                  gridRow: style.gridRow,
                  gridColumn: style.gridColumn,
                };
              }),
            ),
          );
    expect(ilrSpacing, layoutDetails).toEqual(vaultSpacing);
    const ilrCard = page.getByRole("region", {
      name: "Permission not recorded",
      exact: true,
    });
    expect(
      await ilrCard.evaluate((element) => {
        const style = getComputedStyle(element);
        return {
          background: style.backgroundColor,
          border: style.borderRadius,
          color: style.color,
        };
      }),
    ).toEqual(vaultStyle);
    expect(
      await journeyPill.evaluate((element) => {
        const style = getComputedStyle(element);
        return {
          background: style.backgroundImage,
          border: style.borderRadius,
          color: style.color,
        };
      }),
    ).toEqual(vaultPillStyle);
    await page
      .getByRole("link", { name: "Travel", exact: true })
      .first()
      .click();
    const travelPill = page.getByRole("button", {
      name: `Show ${otherName}'s travel`,
    });
    await expect(travelPill).toHaveAttribute("aria-pressed", "true");
    expect(await readCohortSpacing(page)).toEqual(vaultSpacing);
    await expect(
      page.getByRole("progressbar", { name: "Recorded rolling absence usage" }),
    ).toHaveAttribute("aria-valuetext", "Not available yet");
    await page
      .getByRole("button", { name: `Show ${TEST_PROFILE.name}'s travel` })
      .click();
    await expect(
      page.getByRole("button", {
        name: `Show ${TEST_PROFILE.name}'s travel`,
      }),
    ).toHaveAttribute("aria-pressed", "true");
    await travelPill.click();
    await expect(travelPill).toHaveAttribute("aria-pressed", "true");
    await page
      .getByRole("link", { name: "Vault", exact: true })
      .first()
      .click();
    await expect(otherPill).toHaveAttribute("aria-pressed", "true");
    await expect(
      page.getByText("Encrypted storage", { exact: true }),
    ).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
  }
  await ownerPill.click();
  await expect(
    page.getByRole("progressbar", { name: "Document Vault readiness" }),
  ).toHaveAttribute("aria-valuenow", "20");
  await page.reload();
  await enterPin(page, "Four-digit PIN", TEST_PROFILE.pin);
  await page.getByRole("link", { name: "Vault", exact: true }).first().click();
  await ownerPill.click();
  await expect(ownerPill).toContainText("20%");
  await expect(otherPill).toContainText("0%");
});

test("locks from Profile settings and requires the PIN again", async ({
  page,
}) => {
  await page.goto("/");
  await createLocalProfile(page);

  await page.getByRole("link", { name: "Profile", exact: true }).click();
  await page.getByText("Protect this device", { exact: true }).click();
  await page.getByRole("button", { name: "Lock now" }).click();

  await expect(
    page.getByRole("heading", { name: "Enter Security PIN" }),
  ).toBeVisible();

  await enterPin(page, "Four-digit PIN", TEST_PROFILE.pin);
  await expect(
    page.getByRole("link", { name: "ILR", exact: true }).first(),
  ).toHaveAttribute("aria-current", "page");
});

test("enforces a cooldown after five consecutive incorrect PIN attempts", async ({
  page,
}) => {
  await page.goto("/");
  await createLocalProfile(page);
  await page.getByRole("button", { name: "Lock app" }).click();

  for (let attempt = 0; attempt < 5; attempt += 1) {
    await enterPin(page, "Four-digit PIN", "0000");
  }

  await expect(page.getByRole("alert")).toContainText(
    "Too many attempts. Try again in 30 seconds.",
  );
  await expect(page.getByRole("button", { name: "Enter 0" })).toBeDisabled();
  await expect(
    page.getByRole("button", { name: "Forgot PIN?" }),
  ).toBeDisabled();
});

test("forgotten PIN reset removes the vault and encrypted profile records", async ({
  page,
}) => {
  await page.goto("/");
  await createLocalProfile(page);
  await page.getByRole("button", { name: "Lock app" }).click();

  await page.getByRole("button", { name: "Forgot PIN?" }).click();
  await page.getByLabel("Type DELETE to confirm").fill("DELETE");
  page.once("dialog", (dialog) => dialog.accept());
  await page.getByRole("button", { name: "Delete data and reset PIN" }).click();

  const storedValues = await page.evaluate(async () => {
    const database = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("urbanfox-ilr", 8);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });

    const read = (storeName: string, key: string) =>
      new Promise<unknown>((resolve, reject) => {
        const request = database
          .transaction(storeName, "readonly")
          .objectStore(storeName)
          .get(key);
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });

    const result = {
      vault: await read("security", "vault"),
      profiles: await read("profiles", "household-members"),
    };
    database.close();
    return result;
  });

  expect(storedValues.vault).toBeUndefined();
  expect(storedValues.profiles).toBeUndefined();

  await page.reload();
  await expect(page.getByRole("button", { name: "Get started" })).toBeVisible();
});

test("rejects mismatched PIN confirmation during private-space setup", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Get started" }).click();
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Accept and continue" }).click();

  const chooseDigits = page.locator('[data-pin-digit="pin"]');
  const confirmDigits = page.locator('[data-pin-digit="confirmPin"]');
  for (const [index, digit] of [..."4826"].entries())
    await chooseDigits.nth(index).fill(digit);
  for (const [index, digit] of [..."4827"].entries())
    await confirmDigits.nth(index).fill(digit);

  await page.getByRole("button", { name: "Create private space" }).click();
  await expect(page.getByRole("alert")).toContainText("PINs do not match");
  await expect(
    page.getByRole("heading", { name: "Create your four-digit PIN" }),
  ).toBeVisible();
});
