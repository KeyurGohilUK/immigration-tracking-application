import { readFileSync } from "node:fs";

const required = [
  {
    path: "LICENSE",
    fragments: [
      "PROPRIETARY SOFTWARE — ALL RIGHTS RESERVED",
      "Copyright © 2026 Keyur Gohil. All rights reserved.",
    ],
  },
  {
    path: "README.md",
    fragments: [
      "Proprietary software:",
      "Copyright © 2026 Keyur Gohil. All rights reserved.",
    ],
  },
  {
    path: "src/features/legal/components/legal-screen.ts",
    fragments: [
      "<h2>Licence</h2>",
      "Copyright © 2026 Keyur Gohil. All rights reserved.",
      "repository LICENSE",
    ],
  },
];

const errors = [];
for (const item of required) {
  const contents = readFileSync(item.path, "utf8");
  for (const fragment of item.fragments)
    if (!contents.includes(fragment))
      errors.push(`${item.path}: missing required notice fragment: ${fragment}`);
}

if (errors.length > 0) {
  console.error("Proprietary notice check failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("Proprietary licence and copyright notices are present.");
