# UrbanFox ILR — Product Roadmap

This checklist records the agreed plan for the first release. Tasks are ordered
so that calculation correctness and user-data safety are established before
visual polish and public release.

## Phase 0 — Confirm product decisions

- [x] Name the application **UrbanFox ILR**.
- [x] Establish **Freddy the Urban Fox**, a UK urban fox, as the app’s main
      character and user guide.
- [ ] Update the GitHub repository description to use the final name.
- [ ] Confirm Skilled Worker and Health and Care Worker main applicants as the
      first supported settlement route.
- [ ] Choose a public contact email for security and legal enquiries.
- [ ] Confirm whether the initial release is described as alpha or beta.
- [ ] Record the supported browsers and minimum versions.

## Phase 1 — Establish the application foundation

- [x] Create a mobile-first static web application that works on GitHub Pages.
- [x] Choose and document the frontend architecture and folder structure.
- [x] Add semantic HTML, responsive styling, and accessible form foundations.
- [ ] Add a web app manifest and installable Progressive Web App behaviour.
- [x] Define the professional monochrome interface palette and reserve natural
      fox colours exclusively for Freddy; see `docs/brand-guidelines.md`.
- [ ] Create an original, legally distinct visual design for Freddy the Urban
      Fox and document his approved expressions and usage.
- [ ] Add Freddy-based application icons, theme colours, and mobile safe-area
      handling.
- [ ] Add offline application-shell support without caching sensitive exports.
- [x] Add application and data-schema version constants.
- [x] Add formatting, linting, unit-test, build, and browser-test commands.
- [x] Add GitHub Actions checks for every pull request.
- [ ] Configure branch protection for `main` after required checks exist.
- [ ] Document local development, testing, and GitHub Pages deployment.

## Phase 2 — Define privacy and local storage

- [ ] Store all user-entered information locally with IndexedDB.
- [ ] Do not add a database, analytics, advertising, tracking, or online user
      accounts.
- [ ] Treat account creation as creating a local household profile on the
      current device; do not imply that an online account exists.
- [ ] Require the user to create a four-digit local PIN during setup.
- [ ] Derive an encryption key from the PIN using a standard, salted,
      deliberately slow key-derivation function.
- [ ] Encrypt sensitive IndexedDB records with the Web Crypto API rather than
      storing the PIN or personal data as readable text.
- [ ] Keep the unlocked encryption key in memory only and clear it on lock,
      refresh, tab close, or expiry.
- [ ] Add automatic locking after inactivity and when the app returns from the
      background.
- [ ] Limit rapid PIN attempts in the interface without claiming this prevents
      offline brute-force attacks.
- [ ] Explain that a four-digit PIN protects against casual access but is not
      equivalent to strong device encryption or a high-entropy password.
- [ ] Provide no PIN recovery or bypass; forgotten PIN recovery requires
      deleting local data and restoring a backup.
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
- [ ] State that UrbanFox ILR and Freddy are not affiliated with, endorsed by,
      or representative of the UK Government, Home Office, or UKVI.
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

- [ ] Add a local household-owner profile with only information necessary for
      calculations.
- [ ] Add, edit, and delete family-member profiles within the household.
- [ ] Record each member’s name, date of birth, relationship to the household
      owner, and main-applicant or dependant status only where needed.
- [ ] Give every family member an internal identifier so permissions, trips,
      calculations, and backups remain correctly associated.
- [ ] Allow the user to switch between family members from the dashboard.
- [ ] Clearly show when a family member’s immigration route does not yet have a
      supported eligibility calculation.
- [ ] Add, edit, and delete immigration-permission records for each family
      member.
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
- [ ] Run calculations independently for each family member and never combine
      one person’s qualifying residence or absences with another’s.
- [ ] Detect gaps, non-qualifying permission, and incomplete history.
- [ ] Never convert an uncertain or exceptional case into a definite pass.
- [ ] Return structured results: pass, fail, incomplete data, or manual review.
- [ ] Explain which records caused a warning or potential failure.
- [ ] Show the official source, rule version, effective date, and last-verified
      date used by each calculation.
- [ ] Add a prominent warning when the embedded rules may be outdated.

## Phase 6 — Design the mobile-app experience

- [ ] Define Freddy’s role as a friendly guide who explains app features,
      prompts for missing information, and celebrates completed setup steps.
- [ ] Give users a clear way to skip, dismiss, or replay Freddy’s guidance.
- [ ] Ensure Freddy never presents a calculation as legal advice or gives a
      definitive statement of immigration eligibility.
- [ ] Keep legal warnings and critical error messages visually independent from
      Freddy’s conversational guidance.
- [ ] Provide accessible text for every Freddy expression or visual cue and do
      not require animation to understand an instruction.
- [ ] Respect reduced-motion preferences and avoid distracting animation during
      forms, PIN entry, or warning states.
- [ ] Create a dashboard showing progress, estimated eligibility date, absence
      status, and outstanding information.
- [ ] Add mobile bottom navigation for Dashboard, Family, Trips, and More.
- [ ] Add a clear locked screen with PIN entry and safe reset guidance.
- [ ] Add a visible lock-now action and configurable inactivity timeout.
- [ ] Show the currently selected family member consistently on every relevant
      screen.
- [ ] Create a chronological immigration and travel timeline.
- [ ] Show a rolling-absence risk summary without implying legal certainty.
- [ ] Add accessible success, warning, error, and manual-review states.
- [ ] Design appropriate loading, saving, empty, and corrupted-data states.
- [ ] Use large touch targets and mobile safe-area padding.
- [ ] Implement the white, near-black, and neutral-grey interface tokens from
      the brand guidelines.
- [ ] Keep buttons, navigation, charts, status surfaces, and illustrations other
      than Freddy monochrome.
- [ ] Use Freddy’s natural fox palette only inside Freddy artwork; do not reuse
      his orange or cream colours as interface accents.
- [ ] Support the monochrome light theme initially and verify WCAG contrast.
- [ ] Communicate success, warning, error, and review states with labels, icons,
      borders, and structure rather than additional colours.
- [ ] Add a first-use explanation of local storage, backups, and legal limits.

## Phase 7 — Add backup and restore

- [ ] Export all household and family-member records as a downloadable backup.
- [ ] Encrypt backup contents and require the user to set a backup password;
      do not rely on the four-digit app PIN as strong backup protection.
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
- [ ] Test PIN setup, unlock, incorrect attempts, auto-lock, manual lock, and
      forgotten-PIN data reset.
- [ ] Test that encrypted records are not readable directly from IndexedDB.
- [ ] Test family-member isolation so records and calculations cannot be mixed.
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

- Online accounts, server authentication, or cross-device synchronisation.
- A remote database or server-side storage.
- Uploading evidence or passport documents.
- Automated legal advice or a guarantee of eligibility.
- Automatically approving exceptional absences.
- Advertising, analytics, behavioural tracking, or sale of user data.
- Collaboration, public profiles, or sharing records with third parties.
