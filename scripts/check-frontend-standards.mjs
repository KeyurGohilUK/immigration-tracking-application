import { readdir, readFile } from "node:fs/promises";
import { extname, join, relative } from "node:path";

const root = process.cwd();
const failures = [];

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await walk(path)));
    else files.push(path);
  }
  return files;
}

function fail(message) {
  failures.push(message);
}

const stylesheetEntry = await readFile(join(root, "src/styles.css"), "utf8");
const expectedImports = [
  '@import "./styles/foundation.css";',
  '@import "./styles/components/navigation.css";',
  '@import "./styles/application.css";',
  '@import "./styles/components/liquid-glass-dialog.css";',
];
const entryLines = stylesheetEntry
  .split("\n")
  .map((line) => line.trim())
  .filter(Boolean);

if (JSON.stringify(entryLines) !== JSON.stringify(expectedImports)) {
  fail(
    "src/styles.css must remain an ordered stylesheet entrypoint. Put CSS in the documented modules instead of adding rules directly to the entrypoint.",
  );
}

const sourceFiles = await walk(join(root, "src"));
const cssFiles = sourceFiles.filter((path) => extname(path) === ".css");
const tsFiles = sourceFiles.filter((path) => extname(path) === ".ts");

let importantCount = 0;
for (const path of cssFiles) {
  const css = await readFile(path, "utf8");
  importantCount += (css.match(/!important\b/g) ?? []).length;

  if (
    path.endsWith("navigation.css") ||
    path.endsWith("liquid-glass-dialog.css")
  ) {
    if (/!important\b/.test(css)) {
      fail(
        `${relative(root, path)} must not introduce !important; resolve component specificity through the shared design system.`,
      );
    }
  }
}

const legacyImportantBudget = 5;
if (importantCount > legacyImportantBudget) {
  fail(
    `CSS contains ${importantCount} !important declarations; the existing migration budget is ${legacyImportantBudget}. Do not add new ones while legacy styles are being reduced.`,
  );
}

for (const path of cssFiles) {
  const css = await readFile(path, "utf8");
  if (/#000000\b|#111111\b/i.test(css)) {
    fail(
      `${relative(root, path)} contains a retired legacy black light-theme colour. Use Ibiza Sunset design tokens instead.`,
    );
  }
}

for (const path of tsFiles) {
  const source = await readFile(path, "utf8");
  const relativePath = relative(root, path);

  if (
    relativePath !== "src/shared/components/liquid-glass-dialog.ts" &&
    /<dialog\b/i.test(source)
  ) {
    fail(
      `${relativePath} renders a raw <dialog>. Use the shared Ibiza Sunset Liquid Glass dialog component instead.`,
    );
  }

  const buttonTags = source.match(/<button\b[^>]*>/gi) ?? [];
  for (const tag of buttonTags) {
    if (!/\btype\s*=/.test(tag)) {
      fail(
        `${relativePath} contains a <button> without an explicit type attribute.`,
      );
      break;
    }
  }

  const imageTags = source.match(/<img\b[^>]*>/gi) ?? [];
  for (const tag of imageTags) {
    if (!/\balt\s*=/.test(tag)) {
      fail(`${relativePath} contains an <img> without alt text.`);
      break;
    }
  }

  const inlineStyles = source.match(/style\s*=\s*["'][^"']*["']/gi) ?? [];
  for (const style of inlineStyles) {
    if (!/--[a-z0-9-]+\s*:/.test(style)) {
      fail(
        `${relativePath} contains inline presentation CSS. Use a class; inline styles are reserved for runtime CSS custom properties.`,
      );
      break;
    }
  }
}

const indexHtml = await readFile(join(root, "index.html"), "utf8");
const htmlRequirements = [
  [/^<!doctype html>/i, "index.html must declare the HTML5 doctype."],
  [/<html\s+lang="en-GB">/i, 'index.html must declare lang="en-GB".'],
  [
    /<meta\s+name="viewport"[^>]*viewport-fit=cover/i,
    "index.html must keep the responsive viewport metadata including viewport-fit=cover.",
  ],
  [/<title>[^<]+<\/title>/i, "index.html must have a document title."],
  [
    /<script\s+type="module"[^>]*src="\/src\/main\.ts"/i,
    "index.html must load the TypeScript application as a module.",
  ],
];
for (const [pattern, message] of htmlRequirements) {
  if (!pattern.test(indexHtml)) fail(message);
}
if (/<style\b/i.test(indexHtml) || /\sstyle\s*=/.test(indexHtml)) {
  fail("index.html must not contain inline CSS.");
}

if (failures.length > 0) {
  console.error("Frontend standards check failed:\n");
  for (const message of failures) console.error(`- ${message}`);
  process.exit(1);
}

console.log(
  `Frontend standards check passed: ${cssFiles.length} CSS modules, semantic entry HTML, shared dialogs, and no new CSS specificity debt.`,
);
