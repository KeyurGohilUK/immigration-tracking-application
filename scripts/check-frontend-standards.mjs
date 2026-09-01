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
  '@import "./styles/tokens-base.css";',
  '@import "./styles/pages/public.css";',
  '@import "./styles/pages/legal.css";',
  '@import "./styles/pages/security.css";',
  '@import "./styles/components/install-manager.css";',
  '@import "./styles/components/app-shell.css";',
  '@import "./styles/pages/dashboard.css";',
  '@import "./styles/components/forms.css";',
  '@import "./styles/pages/records.css";',
  '@import "./styles/components/dialog-compat.css";',
  '@import "./styles/pages/setup.css";',
  '@import "./styles/pages/documents.css";',
  '@import "./styles/pages/household-dashboard.css";',
  '@import "./styles/components/navigation.css";',
  '@import "./styles/pages/household.css";',
  '@import "./styles/pages/ilr.css";',
  '@import "./styles/theme-dark.css";',
  '@import "./styles/components/form-controls.css";',
  '@import "./styles/pages/member-editor.css";',
  '@import "./styles/pages/travel.css";',
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
  const count = (css.match(/!important\b/g) ?? []).length;
  importantCount += count;

  if (count > 0 && !path.endsWith("tokens-base.css")) {
    fail(
      `${relative(root, path)} contains !important. Only the central reduced-motion accessibility override may use it.`,
    );
  }
}

if (importantCount !== 4) {
  fail(
    `CSS must contain exactly the four reduced-motion accessibility !important declarations; found ${importantCount}.`,
  );
}

for (const path of cssFiles) {
  const css = await readFile(path, "utf8");
  const relativePath = relative(root, path);

  if (/#000000\b|#111111\b/i.test(css)) {
    fail(
      `${relativePath} contains a retired legacy black light-theme colour. Use Ibiza Sunset design tokens instead.`,
    );
  }

  if (
    !relativePath.endsWith("src/styles/components/navigation.css") &&
    /\.(?:mobile-navigation|desktop-navigation|primary-navigation)\b/.test(css)
  ) {
    fail(
      `${relativePath} contains primary-navigation CSS. Navigation styles must be owned by src/styles/components/navigation.css.`,
    );
  }

  if (
    !relativePath.endsWith("src/styles/components/liquid-glass-dialog.css") &&
    /(?:^|\n)\s*(?:html[^,{]+\s+)?\.liquid-dialog(?:\b|-)/m.test(css)
  ) {
    fail(
      `${relativePath} contains Liquid Glass dialog CSS. Shared dialog styles must be owned by src/styles/components/liquid-glass-dialog.css.`,
    );
  }

  if (
    relativePath.endsWith("src/styles/foundation.css") ||
    relativePath.endsWith("src/styles/application.css")
  ) {
    fail(
      `${relativePath} is a retired catch-all stylesheet. Put rules in a focused component or page module.`,
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
