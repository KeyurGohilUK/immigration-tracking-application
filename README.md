# UrbanFox ILR

> **Proprietary software:** This repository is publicly visible for
> transparency and deployment purposes only. It is not open-source software.
> No permission is granted to use, modify, redistribute, republish, or
> independently deploy its source code. GitHub forks and clones are unsupported.
> See [LICENSE](LICENSE).

UrbanFox ILR is a mobile-first, local-only web application for tracking
information relevant to UK indefinite leave to remain eligibility.

**Freddy the Urban Fox**, a friendly UK urban fox, is the app’s main character
and guides users through setup, family profiles, travel records, backups, and
the app’s calculation explanations.

This application is a tracking and organisational tool only. It does not
provide legal or immigration advice and does not determine whether a person is
eligible for indefinite leave to remain. Users must verify results against
current official UK government guidance and obtain appropriate professional
advice before making an immigration application.

UrbanFox ILR and Freddy the Urban Fox are not affiliated with, endorsed by, or
representative of the UK Government, the Home Office, or UK Visas and
Immigration.

Copyright © 2026 Keyur Gohil. All rights reserved.

## Development

Requirements: Node.js 22 and npm.

```bash
npm install
npm run dev
```

Before opening or merging a pull request, run:

```bash
npm run check
npx playwright install chromium
npm run test:e2e
```

GitHub Actions runs formatting, linting, type checking, unit tests, a production
build, and the mobile Playwright journey for every pull request.

## Deployment

The production app is deployed to GitHub Pages from `main` by
`.github/workflows/deploy-pages.yml`. The repository’s Pages source must be set
to **GitHub Actions**.

Every push to `main` builds and deploys the current production app. A deployment
can also be rerun manually from the **Deploy GitHub Pages** workflow. Generated
`dist` files are uploaded as a deployment artifact and are not committed.
