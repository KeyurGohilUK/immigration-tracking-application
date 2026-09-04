import { expect, test, type Page } from "@playwright/test";

const TEST_PROFILE = {
  name: "Frontend Quality Test User",
  dateOfBirth: "2000-01-01",
  pin: "2468",
} as const;

async function enterPin(page: Page, label: string, pin: string): Promise<void> {
  for (const [index, digit] of [...pin].entries()) {
    await page.getByLabel(`${label} digit ${index + 1}`).fill(digit);
  }
}

async function createLocalProfile(page: Page): Promise<void> {
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
}

async function auditVisibleAccessibility(page: Page): Promise<void> {
  const failures = await page.evaluate(() => {
    const issues: string[] = [];
    const visible = (element: Element): boolean => {
      const node = element as HTMLElement;
      const style = window.getComputedStyle(node);
      const box = node.getBoundingClientRect();
      return (
        style.display !== "none" &&
        style.visibility !== "hidden" &&
        box.width > 0 &&
        box.height > 0
      );
    };

    const ids = [...document.querySelectorAll<HTMLElement>("[id]")].map(
      (element) => element.id,
    );
    const duplicates = ids.filter(
      (id, index) => id && ids.indexOf(id) !== index,
    );
    if (duplicates.length > 0)
      issues.push(`Duplicate IDs: ${[...new Set(duplicates)].join(", ")}`);

    const mains = [...document.querySelectorAll("main")].filter(visible);
    if (mains.length !== 1)
      issues.push(
        `Expected exactly one visible main landmark; found ${mains.length}`,
      );

    for (const image of document.querySelectorAll<HTMLImageElement>("img")) {
      if (visible(image) && !image.hasAttribute("alt"))
        issues.push(`Visible image is missing alt text: ${image.src}`);
    }

    for (const control of document.querySelectorAll<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >("input, select, textarea")) {
      if (!visible(control) || control.type === "hidden") continue;
      const labelled =
        control.labels?.length ||
        control.hasAttribute("aria-label") ||
        control.hasAttribute("aria-labelledby");
      if (!labelled)
        issues.push(
          `Visible form control is missing an accessible label: ${control.tagName.toLowerCase()}#${control.id || "(no-id)"}`,
        );
    }

    for (const interactive of document.querySelectorAll<HTMLElement>(
      "button, a[href]",
    )) {
      if (!visible(interactive)) continue;
      const labelledBy = interactive.getAttribute("aria-labelledby");
      const labelledByText = labelledBy
        ? labelledBy
            .split(/\s+/)
            .map((id) => document.getElementById(id)?.textContent ?? "")
            .join(" ")
            .trim()
        : "";
      const name = (
        interactive.getAttribute("aria-label") ||
        labelledByText ||
        interactive.textContent ||
        interactive.getAttribute("title") ||
        ""
      ).trim();
      if (!name)
        issues.push(
          `Visible interactive element has no accessible name: ${interactive.tagName.toLowerCase()}`,
        );
    }

    return issues;
  });

  expect(failures, failures.join("\n")).toEqual([]);
}

async function readThemeContract(page: Page): Promise<{
  primary: string;
  surface: string;
  text: string;
  glass: string;
  bodyBackground: string;
}> {
  return page.evaluate(() => {
    const root = window.getComputedStyle(document.documentElement);
    const body = window.getComputedStyle(document.body);
    return {
      primary: root.getPropertyValue("--ibiza-primary").trim(),
      surface: root.getPropertyValue("--ibiza-surface").trim(),
      text: root.getPropertyValue("--ibiza-text").trim(),
      glass: root.getPropertyValue("--glass-surface").trim(),
      bodyBackground: body.backgroundImage,
    };
  });
}

test("keeps the anonymous landing page accessible", async ({ page }) => {
  await page.goto("/");
  await auditVisibleAccessibility(page);

  await page.getByRole("button", { name: "Get started" }).click();
  await auditVisibleAccessibility(page);
});

test("keeps the authenticated household view accessible", async ({ page }) => {
  await page.goto("/");
  await createLocalProfile(page);
  await auditVisibleAccessibility(page);

  const installButton = page.getByRole("button", {
    name: "Install and updates",
  });
  await installButton.click();
  await auditVisibleAccessibility(page);
});

test("preserves the Ibiza visual theme contract in light and dark modes", async ({
  page,
}) => {
  await page.goto("/");

  const light = await readThemeContract(page);
  expect(light).toMatchObject({
    primary: "#b6005a",
    surface: "#fff7ff",
    text: "#231437",
  });
  expect(light.glass).toContain("255 247 255");
  expect(light.bodyBackground).toContain("radial-gradient");

  const getStarted = page.getByRole("button", { name: "Get started" });
  await expect(getStarted).toHaveCSS("color", "rgb(255, 255, 255)");
  expect(
    await getStarted.evaluate(
      (element) => window.getComputedStyle(element).backgroundImage,
    ),
  ).toContain("linear-gradient");

  await page.evaluate(() =>
    document.documentElement.setAttribute("data-theme", "dark"),
  );

  const dark = await readThemeContract(page);
  expect(dark).toMatchObject({
    primary: "#ffb1c5",
    surface: "#1a0b2e",
    text: "#eddcff",
  });
  expect(dark.glass).toContain("255 255 255");
});

test("keeps the mobile navigation visual contract stable", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "mobile-chromium");

  await page.goto("/");
  await createLocalProfile(page);

  const navigation = page.getByRole("navigation", {
    name: "Primary navigation",
  });
  await expect(navigation).toBeVisible();
  await expect(navigation).toHaveCSS(
    "background-color",
    "rgba(255, 247, 255, 0.78)",
  );
  await expect(navigation).toHaveCSS("border-radius", "999px");

  const ilr = navigation.getByRole("link", { name: "ILR", exact: true });
  await expect(ilr).toBeVisible();
  await expect(ilr).toHaveCSS("color", "rgb(238, 9, 121)");
  const heroIcon = ilr.locator(".navigation-hero-icon");
  expect(
    await heroIcon.evaluate(
      (element) => window.getComputedStyle(element).stroke,
    ),
  ).toContain("mobile-ilr-icon-gradient");
  expect(
    await ilr.evaluate(
      (element) => window.getComputedStyle(element).backgroundImage,
    ),
  ).toBe("none");

  await page.evaluate(() =>
    document.documentElement.setAttribute("data-theme", "dark"),
  );
  await expect(navigation).toHaveCSS(
    "background-color",
    "rgba(26, 11, 46, 0.86)",
  );
  await expect(ilr).toHaveCSS("color", "rgb(238, 9, 121)");
  expect(
    await heroIcon.evaluate(
      (element) => window.getComputedStyle(element).stroke,
    ),
  ).toContain("mobile-ilr-icon-gradient");
});
