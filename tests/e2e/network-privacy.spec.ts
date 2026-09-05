import { expect, test } from "@playwright/test";
import {
  findSensitiveNetworkLeak,
  type ObservedNetworkRequest,
} from "../../src/shared/security/network-privacy";

const PRIVATE = {
  name: "Privacy Canary Person 84721",
  dob: "1991-03-17",
  permissionReference: "VISA-PRIVATE-84721",
  destination: "Canary Destination 84721",
  addressStreet: "Canary Privacy Avenue",
  postcode: "BS7 8ZZ",
  lifeReference: "LIFE-PRIVATE-84721",
  documentName: "Private Evidence 84721",
  documentFileName: "private-evidence-84721.png",
  backupPassword: "privacy-backup-password-84721",
} as const;

async function enterPin(
  page: import("@playwright/test").Page,
  label: string,
  pin: string,
): Promise<void> {
  for (const [index, digit] of [...pin].entries())
    await page.getByLabel(`${label} digit ${index + 1}`).fill(digit);
}

async function createPrivateProfile(
  page: import("@playwright/test").Page,
): Promise<void> {
  await page.getByRole("button", { name: "Get started" }).click();
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Accept and continue" }).click();
  await enterPin(page, "Choose PIN", "8642");
  await enterPin(page, "Confirm PIN", "8642");
  await page.getByLabel("Full name").fill(PRIVATE.name);
  await page.getByLabel("Date of birth").fill(PRIVATE.dob);
  await page.getByLabel("Immigration role").selectOption("main-applicant");
  await page.getByRole("button", { name: "Create household member" }).click();
}

test("never sends local immigration data in network requests", async ({
  page,
}) => {
  const observed: Promise<ObservedNetworkRequest>[] = [];
  page.context().on("request", (request) => {
    observed.push(
      request.allHeaders().then((headers) => ({
        url: request.url(),
        headers,
        postData: request.postData(),
      })),
    );
  });

  await page.goto("/");
  await createPrivateProfile(page);

  await page.getByRole("link", { name: "ILR", exact: true }).first().click();
  await page.getByRole("button", { name: "+ Add past visa" }).click();
  await page.getByRole("button", { name: "Add permission" }).click();
  await page.getByLabel("Immigration route").selectOption("skilled-worker");
  await page.getByLabel("Permission held as").selectOption("main-applicant");
  await page.getByLabel(/Visa grant date/).fill("2022-01-10");
  await page.getByLabel("Permission start date").fill("2022-01-10");
  await page.getByLabel("Permission expiry date").fill("2027-01-10");
  await page.getByLabel("Actual UK arrival date").fill("2022-01-15");
  const permissionReference = page.getByLabel(/reference/i);
  if (await permissionReference.count())
    await permissionReference.first().fill(PRIVATE.permissionReference);
  await page.getByRole("button", { name: "Save permission" }).click();

  await page.getByRole("link", { name: "Travel", exact: true }).first().click();
  await page.getByRole("button", { name: "Add trip" }).click();
  await page.getByLabel("UK departure date").fill("2025-02-01");
  await page.getByLabel(/UK return date/).fill("2025-02-09");
  await page.getByLabel("Destination").fill(PRIVATE.destination);
  await page.getByLabel(/Notes/).fill("Private travel note 84721");
  await page.getByRole("button", { name: "Save trip" }).click();

  await page.getByRole("link", { name: "Vault", exact: true }).first().click();
  const addressSection = page.locator('[data-vault-section="address-history"]');
  await addressSection.locator("summary").click();
  await addressSection.getByRole("button", { name: "Add address" }).click();
  const addressDialog = page.getByRole("dialog", { name: "Address History" });
  const currentAddress = addressDialog.locator(
    "[data-address-new-current-host]",
  );
  await currentAddress.getByLabel("House number / name").fill("84");
  await currentAddress.getByLabel("Street").fill(PRIVATE.addressStreet);
  await currentAddress.getByLabel("Town / city").fill("Bristol");
  await currentAddress.getByLabel("Postcode").fill(PRIVATE.postcode);
  await addressDialog.getByLabel("Start month").fill("2024-01");
  await addressDialog.getByRole("button", { name: "Save & continue" }).click();
  await page
    .getByRole("dialog", { name: "Address History" })
    .getByRole("button", { name: "Close address history" })
    .click();

  const lifeEnglishSection = page.locator(
    '[data-vault-section="life-english"]',
  );
  await lifeEnglishSection.locator("summary").click();
  await lifeEnglishSection
    .getByRole("button", { name: "Add Life in the UK evidence" })
    .click();
  const lifeDialog = page.getByRole("dialog", {
    name: "Add Life in the UK evidence",
  });
  await lifeDialog.getByLabel("Status").selectOption("passed");
  await lifeDialog.getByLabel("Passed date").fill("2026-08-20");
  await lifeDialog
    .getByLabel("UAN / reference number")
    .fill(PRIVATE.lifeReference);
  await lifeDialog.getByRole("button", { name: "Save" }).click();

  const employmentSection = page.locator(
    '[data-vault-section="employment"]',
  );
  await employmentSection.locator("summary").click();
  await employmentSection
    .getByRole("button", { name: "Add Employer letter", exact: true })
    .click();
  const documentDialog = page.getByRole("dialog", {
    name: "Add Employer letter",
  });
  const png = Buffer.concat([
    Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
      "base64",
    ),
    Buffer.from("PRIVATE-DOCUMENT-BYTES-84721"),
  ]);
  await documentDialog.getByLabel("Document file").setInputFiles({
    name: PRIVATE.documentFileName,
    mimeType: "image/png",
    buffer: png,
  });
  await documentDialog
    .getByLabel("Document name")
    .fill(PRIVATE.documentName);
  await documentDialog
    .getByRole("button", { name: "Encrypt and save document" })
    .click();

  await page.getByRole("link", { name: "Profile", exact: true }).click();
  await page.getByText("Backup and restore", { exact: true }).click();
  await page.getByRole("button", { name: "Create encrypted backup" }).click();
  await page
    .getByLabel("Backup password", { exact: true })
    .fill(PRIVATE.backupPassword);
  await page
    .getByLabel("Confirm backup password")
    .fill(PRIVATE.backupPassword);
  const download = page.waitForEvent("download");
  await page.getByRole("button", { name: "Download encrypted backup" }).click();
  await download;

  await page.getByRole("button", { name: "Install and updates" }).click();
  await expect(page.getByText("Installed", { exact: true })).toBeVisible();

  const requests = await Promise.all(observed);
  const sensitiveValues = [
    PRIVATE.name,
    PRIVATE.dob,
    PRIVATE.permissionReference,
    PRIVATE.destination,
    "Private travel note 84721",
    PRIVATE.addressStreet,
    PRIVATE.postcode,
    PRIVATE.lifeReference,
    PRIVATE.documentName,
    PRIVATE.documentFileName,
    "PRIVATE-DOCUMENT-BYTES-84721",
    PRIVATE.backupPassword,
  ];

  expect(requests.length).toBeGreaterThan(0);
  for (const request of requests) {
    const leak = findSensitiveNetworkLeak(request, sensitiveValues);
    expect(
      leak,
      `Sensitive value "${leak ?? ""}" leaked in request ${request.url}`,
    ).toBeNull();
  }

  const origins = new Set(requests.map(({ url }) => new URL(url).origin));
  expect(origins).toEqual(new Set([new URL(page.url()).origin]));
});
