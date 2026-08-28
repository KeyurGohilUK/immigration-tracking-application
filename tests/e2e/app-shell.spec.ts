import { expect, test } from "@playwright/test";

test("shows the mobile UrbanFox foundation and legal boundary", async ({
  page,
}) => {
  await page.goto("/");

  await expect(page).toHaveTitle("UrbanFox ILR");
  await expect(
    page.getByRole("heading", { name: "Let’s organise your ILR journey." }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Tracking estimate—not legal advice" }),
  ).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "Primary navigation" }),
  ).toBeVisible();
  await expect(page.getByRole("link", { name: "Home" })).toHaveAttribute(
    "aria-current",
    "page",
  );
});
