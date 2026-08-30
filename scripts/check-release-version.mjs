import { readFile } from "node:fs/promises";

const metadata = await readFile(
  "src/configuration/release-metadata.ts",
  "utf8",
);
const serviceWorker = await readFile("public/service-worker.js", "utf8");
const release = JSON.parse(await readFile("public/release.json", "utf8"));
const appVersion = metadata.match(/APP_VERSION = "([^"]+)"/)?.[1];
const cacheVersion = serviceWorker.match(/CACHE_VERSION = "([^"]+)"/)?.[1];
const notesBlock = metadata.match(
  /export const RELEASE_NOTES = \[([\s\S]*?)\] as const;/,
)?.[1];
const metadataNotes = notesBlock
  ? [...notesBlock.matchAll(/"((?:\\.|[^"\\])*)"/g)].map((match) =>
      JSON.parse(`"${match[1]}"`),
    )
  : null;

if (
  !appVersion ||
  appVersion !== release.version ||
  appVersion !== cacheVersion
) {
  throw new Error(
    `Release versions must match: app=${appVersion}, manifest=${release.version}, cache=${cacheVersion}`,
  );
}

if (
  !metadataNotes ||
  metadataNotes.length === 0 ||
  JSON.stringify(metadataNotes) !== JSON.stringify(release.notes)
) {
  throw new Error(
    "Release notes must be non-empty and match the current version's public What’s new notes.",
  );
}
