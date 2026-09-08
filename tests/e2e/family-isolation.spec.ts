import { expect, test } from "@playwright/test";

test("keeps family-member travel and ILR state isolated when switching profiles", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Get started" }).click();
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Accept and continue" }).click();

  for (const [index, digit] of [..."2468"].entries()) {
    await page.getByLabel(`Choose PIN digit ${index + 1}`).fill(digit);
    await page.getByLabel(`Confirm PIN digit ${index + 1}`).fill(digit);
  }

  await page.getByLabel("Full name").fill("Isolation Owner");
  await page.getByLabel("Date of birth").fill("1990-01-01");
  await page.getByLabel("Immigration role").selectOption("main-applicant");
  await page.getByRole("button", { name: "Create household member" }).click();

  await page.getByRole("link", { name: "Family", exact: true }).first().click();
  await page.getByRole("button", { name: "Add Household Member" }).click();
  await expect(
    page.getByRole("heading", { name: "Add household member", level: 2 }),
  ).toBeFocused();
  await expect(
    page.getByRole("button", { name: "Close family form" }),
  ).not.toBeFocused();
  await page.getByLabel("Full name").fill("Isolation Dependant");
  await page.getByLabel("Date of birth").fill("1995-01-01");
  await page.getByLabel("Immigration role").selectOption("dependant");
  await page.getByRole("button", { name: "Save household member" }).click();

  await page.getByRole("link", { name: "ILR", exact: true }).first().click();
  await page
    .getByRole("button", { name: "Show Isolation Owner's ILR journey" })
    .click();
  await page.getByRole("button", { name: "Add Permission" }).click();
  await expect(
    page.getByRole("heading", { name: "Add immigration permission", level: 2 }),
  ).toBeFocused();
  await expect(
    page.getByRole("button", { name: "Close permission form" }),
  ).not.toBeFocused();
  await page.getByLabel("Immigration route").selectOption("skilled-worker");
  await page.getByLabel("Permission held as").selectOption("main-applicant");
  await page.getByLabel(/Visa grant date/).fill("2022-01-01");
  await page.getByLabel("Permission start date").fill("2022-01-01");
  await page.getByLabel("Permission expiry date").fill("2028-01-01");
  await page.getByLabel("Actual UK arrival date").fill("2022-01-01");
  await page.getByRole("button", { name: "Save permission" }).click();

  await page.getByRole("link", { name: "Travel", exact: true }).first().click();
  await page
    .getByRole("button", { name: "Show Isolation Owner's travel" })
    .click();
  await page.getByRole("button", { name: "Add trip" }).click();
  await expect(
    page.getByRole("heading", { name: "Add trip", level: 2 }),
  ).toBeFocused();
  await page.getByLabel("UK departure date").fill("2024-02-01");
  await page.getByLabel(/UK return date/).fill("2024-02-10");
  await page.getByLabel("Destination").fill("Owner-only trip");
  await page.getByRole("button", { name: "Save trip" }).click();
  await expect(
    page.getByText("Owner-only trip", { exact: true }),
  ).toBeVisible();

  await page
    .getByRole("button", { name: "Show Isolation Dependant's travel" })
    .click();
  await expect(page.getByText("Owner-only trip", { exact: true })).toHaveCount(
    0,
  );
  await expect(page.getByText("No trips recorded")).toBeVisible();

  await page.getByRole("link", { name: "ILR", exact: true }).first().click();
  await page
    .getByRole("button", { name: "Show Isolation Dependant's ILR journey" })
    .click();
  await expect(
    page.getByRole("region", { name: "Permission not recorded", exact: true }),
  ).toBeVisible();
});


test("keeps Document Vault evidence isolated between household members", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Get started" }).click();
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Accept and continue" }).click();

  for (const [index, digit] of [..."2468"].entries()) {
    await page.getByLabel(`Choose PIN digit ${index + 1}`).fill(digit);
    await page.getByLabel(`Confirm PIN digit ${index + 1}`).fill(digit);
  }

  await page.getByLabel("Full name").fill("Vault Owner");
  await page.getByLabel("Date of birth").fill("1990-01-01");
  await page.getByLabel("Immigration role").selectOption("main-applicant");
  await page.getByRole("button", { name: "Create household member" }).click();

  await page.getByRole("link", { name: "Family", exact: true }).first().click();
  await page.getByRole("button", { name: "Add Household Member" }).click();
  await page.getByLabel("Full name").fill("Vault Dependant");
  await page.getByLabel("Date of birth").fill("1995-01-01");
  await page.getByLabel("Immigration role").selectOption("dependant");
  await page.getByRole("button", { name: "Save household member" }).click();

  await page.getByRole("link", { name: "Vault", exact: true }).first().click();
  await page
    .getByRole("button", { name: "Show Vault Owner's documents" })
    .click();

  const employment = page.locator('[data-vault-section="employment"]');
  await employment.locator("summary").click();
  await employment
    .getByRole("button", { name: "Add Employer letter", exact: true })
    .click();
  const dialog = page.getByRole("dialog", { name: "Add Employer letter" });
  await dialog.getByLabel("Document file").setInputFiles({
    name: "owner-employer-letter.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=",
      "base64",
    ),
  });
  await dialog.getByLabel("Document name").fill("Owner employer letter");
  await dialog
    .getByRole("button", { name: "Encrypt and save document" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Owner employer letter" }),
  ).toBeVisible();

  await page
    .getByRole("button", { name: "Show Vault Dependant's documents" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Owner employer letter" }),
  ).toHaveCount(0);
  await expect(page.getByText("No documents added yet")).toBeVisible();

  await page
    .getByRole("button", { name: "Show Vault Owner's documents" })
    .click();
  await expect(
    page.getByRole("heading", { name: "Owner employer letter" }),
  ).toBeVisible();
});
