# UK ILR Tracker — Product Roadmap

This checklist records the agreed plan for the first release. Tasks are ordered
so that calculation correctness and user-data safety are established before
visual polish and public release.

## Phase 0 — Confirm product decisions

- [ ] Choose the final app name and repository description.
- [ ] Confirm Skilled Worker and Health and Care Worker main applicants as the
      first supported settlement route.
- [ ] Choose a public contact email for security and legal enquiries.
- [ ] Confirm whether the initial release is described as alpha or beta.
- [ ] Record the supported browsers and minimum versions.

## Phase 1 — Establish the application foundation

- [ ] Create a mobile-first static web application that works on GitHub Pages.
- [ ] Choose and document the frontend architecture and folder structure.
- [ ] Add semantic HTML, responsive styling, and accessible form foundations.
- [ ] Add a web app manifest and installable Progressive Web App behaviour.
- [ ] Add an application icon, theme colours, and mobile safe-area handling.
- [ ] Add offline application-shell support without caching sensitive exports.
- [ ] Add application and data-schema version constants.
- [ ] Add formatting, linting, unit-test, build, and browser-test commands.
- [ ] Add GitHub Actions checks for every pull request.
- [ ] Configure branch protection for `main` after required checks exist.
- [ ] Document local development, testing, and GitHub Pages deployment.

## Phase 2 — Define privacy and local storage

- [ ] Store all user-entered information locally with IndexedDB.
- [ ] Do not add a database, analytics, advertising, tracking, or user accounts.
- [ ] Define a versioned local-data schema and migration mechanism.
- [ ] Store immigration permissions separately from travel records.
- [ ] Store visa grant dates, expiry dates, and actual UK arrival dates
      separately.
- [ ] Validate all records before saving them.
- [ ] Prevent or explain overlapping travel records and invalid date ranges.
- [ ] Provide a clear empty state when no records exist.
- [ ] Add a permanent indication that data is stored only on the current device.
- [ ] Add a “Delete all local data” action with destructive confirmation.
- [ ] Test behaviour when browser storage is unavailable or full.

## Phase 3 — Add legal and safety content

- [ ] Create Terms and Conditions for the public application.
- [ ] State that the app is a tracking and organisational tool only.
- [ ] State that results are estimates and are not legal or immigration advice.
- [ ] Tell users to verify current GOV.UK guidance and obtain qualified advice.
- [ ] Add an appropriately limited warranty and liability disclaimer.
- [ ] Explain that the user is responsible for evidence, deadlines, backups, and
      their immigration application.
- [ ] Explain that clearing browser data, uninstalling the app, or losing the
      device can permanently delete locally stored records.
- [ ] Warn that exported backups may contain sensitive personal information.
- [ ] Add Privacy, Terms, About, and Licence views linked from the app.
- [ ] Require Terms acceptance before first use.
- [ ] Store the accepted Terms version and acceptance date locally.
- [ ] Require renewed acceptance following a material Terms update.
- [ ] Display “Tracking estimate — not legal advice” near calculated results.
- [ ] Add the chosen contact email to `SECURITY.md` before public release.
- [ ] Obtain professional legal review before describing the app as production
      ready.

## Phase 4 — Build the core data-entry experience

- [ ] Add a simple local profile with only information necessary for
      calculations.
- [ ] Add, edit, and delete immigration-permission records.
- [ ] Record route, permission start, expiry, UK arrival, and main-applicant or
      dependant status.
- [ ] Add, edit, and delete trips outside the UK.
- [ ] Record departure date, return date, destination, and optional notes.
- [ ] Allow a trip to remain open while the user is outside the UK.
- [ ] Allow a user to flag a potentially permitted or exceptional absence.
- [ ] Make clear that exceptional absences require evidence and manual review.
- [ ] Add confirmations for destructive actions.
- [ ] Ensure forms work comfortably on narrow mobile screens and with keyboards.
- [ ] Add useful validation messages without presenting legal conclusions.

## Phase 5 — Implement the calculation engine

- [ ] Keep calculation logic independent from the user interface and storage.
- [ ] Create versioned, effective-dated route configurations.
- [ ] Support Skilled Worker and Health and Care Worker main applicants first.
- [ ] Define the exact permission categories that may count for that route.
- [ ] Exclude dependant permission from a main-applicant qualifying period.
- [ ] Count only complete days outside the UK.
- [ ] Exclude both the UK departure day and UK return day from absence totals.
- [ ] Use UK civil calendar dates rather than timestamps or elapsed hours.
- [ ] Calculate absence totals across every rolling 12-calendar-month window.
- [ ] Flag a potential failure only when countable absences exceed 180 days.
- [ ] Handle the pre-11-January-2018 transitional calculation separately.
- [ ] Calculate the qualifying-period completion date in calendar years.
- [ ] Apply the route-specific 28-day early-application rule.
- [ ] Show the estimated earliest application date.
- [ ] Detect gaps, non-qualifying permission, and incomplete history.
- [ ] Never convert an uncertain or exceptional case into a definite pass.
- [ ] Return structured results: pass, fail, incomplete data, or manual review.
- [ ] Explain which records caused a warning or potential failure.
- [ ] Show the official source, rule version, effective date, and last-verified
      date used by each calculation.
- [ ] Add a prominent warning when the embedded rules may be outdated.

## Phase 6 — Design the mobile-app experience

- [ ] Create a dashboard showing progress, estimated eligibility date, absence
      status, and outstanding information.
- [ ] Add mobile bottom navigation for Dashboard, Permissions, Trips, and More.
- [ ] Create a chronological immigration and travel timeline.
- [ ] Show a rolling-absence risk summary without implying legal certainty.
- [ ] Add accessible success, warning, error, and manual-review states.
- [ ] Design appropriate loading, saving, empty, and corrupted-data states.
- [ ] Use large touch targets and mobile safe-area padding.
- [ ] Support light mode initially and ensure adequate colour contrast.
- [ ] Ensure important information is not communicated by colour alone.
- [ ] Add a first-use explanation of local storage, backups, and legal limits.

## Phase 7 — Add backup and restore

- [ ] Export all local records as a downloadable JSON backup.
- [ ] Include backup format, schema version, app version, and export timestamp.
- [ ] Use a clear dated filename.
- [ ] Validate the file type, format marker, schema, and individual records
      before import.
- [ ] Reject unsupported, malformed, or unexpectedly large backup files safely.
- [ ] Show an import summary before changing existing data.
- [ ] Use replace-only restore for the first release to avoid unsafe merging.
- [ ] Require confirmation before replacing local data.
- [ ] Preserve existing data if any restore step fails.
- [ ] Prompt the user to create a backup before destructive replacement.
- [ ] Confirm successful export and restore.
- [ ] Test restoration from every supported older schema version.

## Phase 8 — Test correctness and resilience

- [ ] Unit test every calculation rule and route configuration.
- [ ] Test same-day travel, one-day travel, open trips, and overlapping trips.
- [ ] Test exactly 180 days and more than 180 days.
- [ ] Test overlapping rolling windows containing multiple trips.
- [ ] Test leap years, month ends, year ends, and daylight-saving transitions.
- [ ] Test the 28-day application window.
- [ ] Test visa gaps, route changes, and first-entry absence counting.
- [ ] Test missing and contradictory information.
- [ ] Test IndexedDB migrations and interrupted writes.
- [ ] Test backup round trips and malicious or corrupted import files.
- [ ] Add browser tests for the principal mobile user journey.
- [ ] Run automated accessibility checks.
- [ ] Test offline launch and service-worker updates.
- [ ] Verify that no personal data is sent in network requests.
- [ ] Test production output under the GitHub Pages subdirectory path.

## Phase 9 — Prepare the public release

- [ ] Configure GitHub Pages deployment through GitHub Actions.
- [ ] Use least-privilege workflow permissions.
- [ ] Add a restrictive Content Security Policy where GitHub Pages permits it.
- [ ] Add secure browser headers or document GitHub Pages limitations.
- [ ] Confirm that no secrets, personal data, or test records are committed.
- [ ] Confirm the proprietary licence and copyright notices appear in the
      repository and application.
- [ ] Complete a manual calculation review against current official GOV.UK
      rules.
- [ ] Record the rules verification date in the release.
- [ ] Complete the legal-content review.
- [ ] Test install, offline use, update, backup, restore, and data deletion on
      supported mobile devices.
- [ ] Publish a versioned beta release with known limitations.
- [ ] Add a release process for updating cached PWA files safely.

## Later releases

These are deliberately outside the first release and require separately
verified route configurations:

- [ ] Skilled Worker dependant partners.
- [ ] Long Residence, including the 11 April 2024 transitional absence rules.
- [ ] Family partner and parent five-year and ten-year routes.
- [ ] Global Talent three-year and five-year routes.
- [ ] Hong Kong BNO, UK Ancestry, Scale-up, and other settlement routes.
- [ ] Optional local reminders and calendar integration.
- [ ] Additional countries only after creating independent legal-rule engines.

## Explicitly out of scope for the first release

- Cloud accounts, login, or cross-device synchronisation.
- A remote database or server-side storage.
- Uploading evidence or passport documents.
- Automated legal advice or a guarantee of eligibility.
- Automatically approving exceptional absences.
- Advertising, analytics, behavioural tracking, or sale of user data.
- Collaboration, public profiles, or sharing records with third parties.
