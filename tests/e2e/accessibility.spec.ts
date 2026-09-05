import { expect, test, type Page } from "@playwright/test";

const PROFILE = {
  name: "Accessibility Test User",
  dateOfBirth: "1990-01-01",
  pin: "2468",
} as const;

async function enterPin(page: Page, label: string, pin: string): Promise<void> {
  for (const [index, digit] of [...pin].entries())
    await page.getByLabel(`${label} digit ${index + 1}`).fill(digit);
}

async function createLocalProfile(page: Page): Promise<void> {
  await page.getByRole("button", { name: "Get started" }).click();
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Accept and continue" }).click();
  await enterPin(page, "Choose PIN", PROFILE.pin);
  await enterPin(page, "Confirm PIN", PROFILE.pin);
  await page.getByLabel("Full name").fill(PROFILE.name);
  await page.getByLabel("Date of birth").fill(PROFILE.dateOfBirth);
  await page.getByLabel("Immigration role").selectOption("main-applicant");
  await page.getByRole("button", { name: "Create household member" }).click();
}

async function auditPage(page: Page): Promise<void> {
  const issues = await page.evaluate(() => {
    const failures: string[] = [];
    const isVisible = (element: Element): boolean => {
      const node = element as HTMLElement;
      const style = getComputedStyle(node);
      const box = node.getBoundingClientRect();
      return (
        style.display !== "none" &&
        style.visibility !== "hidden" &&
        box.width > 0 &&
        box.height > 0
      );
    };

    const ids = [...document.querySelectorAll<HTMLElement>("[id]")]
      .map(({ id }) => id)
      .filter(Boolean);
    const duplicates = [
      ...new Set(ids.filter((id, index) => ids.indexOf(id) !== index)),
    ];
    if (duplicates.length > 0)
      failures.push(`Duplicate IDs: ${duplicates.join(", ")}`);

    const visibleMains = [...document.querySelectorAll("main")].filter(
      isVisible,
    );
    if (visibleMains.length !== 1)
      failures.push(
        `Expected one visible main landmark; found ${visibleMains.length}`,
      );

    for (const image of document.querySelectorAll<HTMLImageElement>("img")) {
      if (isVisible(image) && !image.hasAttribute("alt"))
        failures.push(`Visible image missing alt text: ${image.src}`);
    }

    for (const control of document.querySelectorAll<
      HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
    >("input, select, textarea")) {
      if (!isVisible(control) || control.type === "hidden") continue;
      const labelled =
        Boolean(control.labels?.length) ||
        control.hasAttribute("aria-label") ||
        control.hasAttribute("aria-labelledby");
      if (!labelled)
        failures.push(
          `Visible form control missing accessible label: ${control.tagName.toLowerCase()}#${control.id || "(no-id)"}`,
        );
    }

    for (const interactive of document.querySelectorAll<HTMLElement>(
      'button, a[href], summary, [role="button"]',
    )) {
      if (!isVisible(interactive)) continue;
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
        failures.push(
          `Visible interactive element has no accessible name: ${interactive.tagName.toLowerCase()}`,
        );
    }

    for (const dialog of document.querySelectorAll<HTMLDialogElement>(
      "dialog[open]",
    )) {
      if (!isVisible(dialog)) continue;
      const labelId = dialog.getAttribute("aria-labelledby");
      if (!labelId || !document.getElementById(labelId))
        failures.push(
          `Open dialog #${dialog.id} is missing a valid aria-labelledby target`,
        );
      if (!dialog.contains(document.activeElement))
        failures.push(`Keyboard focus is outside open dialog #${dialog.id}`);
    }

    for (const element of document.querySelectorAll<HTMLElement>(
      '[aria-hidden="true"]',
    )) {
      if (
        element === document.activeElement ||
        element.contains(document.activeElement)
      )
        failures.push("Keyboard focus is inside aria-hidden content");
    }

    for (const element of document.querySelectorAll<HTMLElement>(
      "[tabindex]",
    )) {
      const value = Number(element.getAttribute("tabindex"));
      if (value > 0) failures.push(`Positive tabindex found: ${value}`);
    }

    return failures;
  });

  expect(issues, issues.join("\n")).toEqual([]);
}

function luminance(hex: string): number {
  const channels = hex
    .replace("#", "")
    .match(/.{2}/g)
    ?.map((value) => Number.parseInt(value, 16) / 255);
  if (!channels || channels.length !== 3)
    throw new Error(`Unsupported colour value: ${hex}`);
  const linear = channels.map((value) =>
    value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4,
  );
  const [red = 0, green = 0, blue = 0] = linear;
  return red * 0.2126 + green * 0.7152 + blue * 0.0722;
}

function contrastRatio(left: string, right: string): number {
  const first = luminance(left);
  const second = luminance(right);
  const lighter = Math.max(first, second);
  const darker = Math.min(first, second);
  return (lighter + 0.05) / (darker + 0.05);
}

test("passes automated accessibility checks across key public and authenticated views", async ({
  page,
}) => {
  await page.goto("/");
  await auditPage(page);

  await page.getByRole("button", { name: "Get started" }).click();
  await auditPage(page);

  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Accept and continue" }).click();
  await auditPage(page);

  await enterPin(page, "Choose PIN", PROFILE.pin);
  await enterPin(page, "Confirm PIN", PROFILE.pin);
  await page.getByLabel("Full name").fill(PROFILE.name);
  await page.getByLabel("Date of birth").fill(PROFILE.dateOfBirth);
  await page.getByLabel("Immigration role").selectOption("main-applicant");
  await page.getByRole("button", { name: "Create household member" }).click();
  await auditPage(page);

  await page.getByRole("link", { name: "Vault", exact: true }).first().click();
  await auditPage(page);

  await page.getByRole("link", { name: "Travel", exact: true }).first().click();
  await auditPage(page);
});

test("keeps dialogs labelled and keyboard focus on accessible content", async ({
  page,
}) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Install and updates" }).click();

  const dialog = page.getByRole("dialog", { name: "Install and updates" });
  await expect(dialog).toBeVisible();
  await expect
    .poll(() =>
      dialog.evaluate(
        (element) =>
          element.contains(document.activeElement) &&
          document.activeElement?.getAttribute("aria-hidden") !== "true",
      ),
    )
    .toBe(true);

  const close = dialog.getByRole("button", {
    name: "Close install and updates",
  });
  await expect(close).toBeFocused();

  await page.keyboard.press("Escape");
  await expect(dialog).not.toBeVisible();
  await expect(
    page.getByRole("button", { name: "Install and updates" }),
  ).toBeFocused();
});

test("meets WCAG AA contrast for supported light-theme semantic tokens", async ({
  page,
}) => {
  await page.goto("/");
  const colours = await page.evaluate(() => {
    const root = getComputedStyle(document.documentElement);
    return {
      surface: root.getPropertyValue("--ibiza-surface").trim(),
      text: root.getPropertyValue("--ibiza-text").trim(),
      muted: root.getPropertyValue("--ibiza-text-muted").trim(),
      primary: root.getPropertyValue("--ibiza-primary").trim(),
      danger: root.getPropertyValue("--colour-danger").trim(),
    };
  });

  expect(contrastRatio(colours.text, colours.surface)).toBeGreaterThanOrEqual(
    4.5,
  );
  expect(contrastRatio(colours.muted, colours.surface)).toBeGreaterThanOrEqual(
    4.5,
  );
  expect(
    contrastRatio(colours.primary, colours.surface),
  ).toBeGreaterThanOrEqual(4.5);
  expect(contrastRatio(colours.danger, colours.surface)).toBeGreaterThanOrEqual(
    4.5,
  );
});

test("communicates document readiness states with text and structure, not colour alone", async ({
  page,
}) => {
  await page.goto("/");
  await createLocalProfile(page);
  await page.getByRole("link", { name: "Vault", exact: true }).first().click();

  const sections = page.locator("[data-vault-section]");
  await expect(sections.first()).toBeVisible();
  const count = await sections.count();
  expect(count).toBeGreaterThan(0);

  for (let index = 0; index < count; index += 1) {
    const section = sections.nth(index);
    const status = section.locator(".vault-category-status");
    await expect(status).toBeVisible();
    const label = (await status.textContent())?.trim() ?? "";
    expect([
      "Complete",
      "Partial",
      "Needs attention",
      "To do",
      "Required later",
    ]).toContain(label);

    const summary = section.locator("summary");
    await expect(summary).toContainText(label);
    await expect(section.locator(".vault-category-state")).toHaveAttribute(
      "aria-hidden",
      "true",
    );
  }
});
