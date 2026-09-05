import { expect, test } from "@playwright/test";

test("serves the production PWA correctly from the GitHub Pages repository path", async ({
  context,
  page,
}) => {
  await page.goto("./");

  await expect(page).toHaveTitle("UrbanFox ILR");
  await expect(
    page.getByRole("heading", { name: "Keep your ILR journey organised." }),
  ).toBeVisible();

  const deployment = await page.evaluate(async () => {
    const base = new URL(".", window.location.href).pathname;
    const resources = [
      ...document.querySelectorAll<HTMLScriptElement>("script[src]"),
      ...document.querySelectorAll<HTMLLinkElement>("link[href]"),
    ].map(
      (element) =>
        new URL(
          element instanceof HTMLScriptElement ? element.src : element.href,
          window.location.href,
        ),
    );
    const localResources = resources
      .filter(({ origin }) => origin === window.location.origin)
      .map(({ pathname }) => pathname);

    const manifestLink = document.querySelector<HTMLLinkElement>(
      'link[rel="manifest"]',
    );
    const manifestUrl = new URL(manifestLink?.href ?? "", window.location.href);
    const manifest = await fetch(manifestUrl).then((response) =>
      response.json(),
    );

    const releaseUrl = new URL("./release.json", window.location.href);
    const releaseStatus = await fetch(releaseUrl, { cache: "no-store" }).then(
      (response) => response.status,
    );

    const registration = await navigator.serviceWorker.ready;

    return {
      base,
      localResources,
      manifestPath: manifestUrl.pathname,
      manifestStartUrl: manifest.start_url,
      manifestIcons: manifest.icons.map((icon: { src: string }) => icon.src),
      releaseStatus,
      serviceWorkerScope: new URL(registration.scope).pathname,
      controlled: Boolean(navigator.serviceWorker.controller),
    };
  });

  expect(deployment.base).toBe("/immigration-tracking-application/");
  expect(deployment.localResources.length).toBeGreaterThan(0);
  for (const path of deployment.localResources)
    expect(path.startsWith("/immigration-tracking-application/")).toBe(true);
  expect(deployment.manifestPath).toBe(
    "/immigration-tracking-application/manifest.webmanifest",
  );
  expect(deployment.manifestStartUrl).toBe("./");
  expect(deployment.manifestIcons).toEqual([
    "./icon-192.png",
    "./icon-512.png",
  ]);
  expect(deployment.releaseStatus).toBe(200);
  expect(deployment.serviceWorkerScope).toBe(
    "/immigration-tracking-application/",
  );

  if (!deployment.controlled) {
    await page.reload();
    await expect
      .poll(() =>
        page.evaluate(() => Boolean(navigator.serviceWorker.controller)),
      )
      .toBe(true);
  }

  await context.setOffline(true);
  await page.reload();
  await expect(
    page.getByRole("heading", { name: "Keep your ILR journey organised." }),
  ).toBeVisible();
  await context.setOffline(false);
});

test("enforces the production content security policy", async ({ page }) => {
  await page.goto("./");

  const policy = await page
    .locator('meta[http-equiv="Content-Security-Policy"]')
    .getAttribute("content");

  expect(policy).toContain("default-src 'self'");
  expect(policy).toContain("script-src 'self'");
  expect(policy).toContain("connect-src 'self'");
  expect(policy).toContain("object-src 'none'");
  expect(policy).toContain("base-uri 'self'");

  const blocked = await page.evaluate(async () => {
    try {
      await fetch("https://example.com/urbanfox-csp-probe");
      return false;
    } catch {
      return true;
    }
  });
  expect(blocked).toBe(true);
});
