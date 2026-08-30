# UrbanFox ILR

> **Proprietary software:** This repository is publicly visible for
> transparency and deployment purposes only. It is not open-source software.
> No permission is granted to use, modify, redistribute, republish, or
> independently deploy its source code. GitHub forks and clones are unsupported.
> See [LICENSE](LICENSE).

UrbanFox ILR is a mobile-first, local-only web application for tracking
information relevant to UK indefinite leave to remain eligibility.

The interface adapts to its device: signed-in pages scroll beneath a translucent
sticky header, and mobile screens use a floating icon dock that becomes smaller
and more transparent while scrolling. Desktop screens use a wider website
layout with labelled top navigation and two-column content.

Anonymous visitors see a public introduction before entering local-profile
setup. Tracker navigation and device controls are not rendered on the public
screen.

Local profiles are protected by a four-digit PIN. The PIN derives an encryption
key in the browser and is never stored; see [Local PIN and encrypted
vault](docs/local-security.md) for the design and its limitations.
Household owners can add, edit, and delete separate encrypted family-member
profiles without sending those details to a server, then switch the active
tracking profile consistently between Home and Family.
Each profile can keep a separate encrypted immigration-permission history with
route, grant date, permission dates, actual UK arrival, and
applicant/dependant status.
It can also keep separate encrypted travel records with open-trip support,
overlap checks, and flags for absences that require evidence and manual review.
The Home dashboard performs a limited, local recorded-absence check for Skilled
Worker and Health and Care Worker main applicants. Its versioned method and
official GOV.UK sources are documented in
[Calculation methodology](docs/calculation-methodology.md); it is not a full
eligibility result.

Supported browsers can install the site as a Progressive Web App. The app
provides an install button when the browser reports that installation is
available and caches only same-origin application resources for offline launch.
The shared install icon in every screen header opens installed/latest versions
and release notes, and can safely clear only UrbanFox application caches before
reloading; encrypted IndexedDB records are preserved.
The More screen keeps the app's local-only storage status visible and provides
access to locking, legal information, and encrypted backup downloads. Backups
use a separate password rather than the four-digit local PIN. Restore validates
the file and every record, shows a summary, and replaces local records only
after explicit confirmation in one atomic transaction.
Users can also permanently delete every encrypted record, the local PIN vault,
and Terms acceptance through a typed and final destructive confirmation.
The locked screen offers the same protected reset when a PIN has been forgotten;
there is no PIN recovery or bypass.

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
