import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { basename, extname } from "node:path";

const tracked = execFileSync("git", ["ls-files"], { encoding: "utf8" })
  .split("\n")
  .filter(Boolean);

const errors = [];
const binaryExtensions = new Set([
  ".gif",
  ".ico",
  ".jpeg",
  ".jpg",
  ".pdf",
  ".png",
  ".webp",
  ".zip",
]);

const secretPatterns = [
  ["private key", /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/],
  ["AWS access key", /\bAKIA[0-9A-Z]{16}\b/],
  ["GitHub token", /\bgh[pousr]_[A-Za-z0-9_]{30,}\b/],
  ["Supabase management token", /\bsbp_[A-Za-z0-9]{20,}\b/],
];

const syntheticMarkers = [
  "Urban Fox Test User",
  "Privacy Canary Person 84721",
  "Offline Resilience User",
  "Encrypted Test Person",
];

for (const path of tracked) {
  const name = basename(path);
  if ((name === ".env" || name.startsWith(".env.")) && name !== ".env.example")
    errors.push(`${path}: committed environment file`);

  if ([".key", ".p12", ".pfx"].includes(extname(path).toLowerCase()))
    errors.push(`${path}: committed private-key container`);

  if (binaryExtensions.has(extname(path).toLowerCase())) continue;

  let contents;
  try {
    contents = readFileSync(path, "utf8");
  } catch {
    continue;
  }

  for (const [label, pattern] of secretPatterns)
    if (pattern.test(contents)) errors.push(`${path}: possible ${label}`);

  const testOnly =
    path.includes("/tests/") ||
    path.startsWith("tests/") ||
    path.includes(".test.") ||
    path.includes(".spec.");
  if (!testOnly && path !== "scripts/check-repository-safety.mjs")
    for (const marker of syntheticMarkers)
      if (contents.includes(marker))
        errors.push(`${path}: synthetic test record escaped test-only files`);

  if (/urbanfox-ilr-backup-\d{4}-\d{2}-\d{2}\.json$/i.test(path))
    errors.push(`${path}: generated backup file is committed`);
}

if (errors.length > 0) {
  console.error("Repository safety check failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(
  "Repository safety check passed: no high-confidence secrets, private-key containers, generated backups, or known synthetic records outside tests.",
);
