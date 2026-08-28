import { readFile } from "node:fs/promises";

const metadata = await readFile(
  "src/configuration/release-metadata.ts",
  "utf8",
);
const serviceWorker = await readFile("public/service-worker.js", "utf8");
const release = JSON.parse(await readFile("public/release.json", "utf8"));
const appVersion = metadata.match(/APP_VERSION = "([^"]+)"/)?.[1];
const cacheVersion = serviceWorker.match(/CACHE_VERSION = "([^"]+)"/)?.[1];

if (
  !appVersion ||
  appVersion !== release.version ||
  appVersion !== cacheVersion
) {
  throw new Error(
    `Release versions must match: app=${appVersion}, manifest=${release.version}, cache=${cacheVersion}`,
  );
}
