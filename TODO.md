# UrbanFox ILR — Active Roadmap

This file contains only work that is still pending or deliberately deferred.
The reconciled historical roadmap, including completed work, is archived at
[`docs/archive/product-roadmap-2026-09-04.md`](docs/archive/product-roadmap-2026-09-04.md).

Document Vault-specific work is tracked separately in
[`docs/document-vault-roadmap.md`](docs/document-vault-roadmap.md).

## Product and release decisions

- [ ] Update the GitHub repository description to use the final UrbanFox ILR name.
- [ ] Choose a public contact email for security and legal enquiries.
- [ ] Confirm whether the initial public release is described as alpha or beta.
- [ ] Record supported browsers and minimum versions.
- [ ] Configure branch protection for `main` after required checks exist.

## Freddy and onboarding

- [ ] Create an original, legally distinct visual design for Freddy and document
      approved expressions and usage.
- [ ] Add Freddy-based application icons and complete documented artwork usage.
- [ ] Define Freddy’s guidance role for explaining features, prompting for
      missing information, and celebrating completed setup steps.
- [ ] Give users a clear way to skip, dismiss, or replay Freddy guidance.
- [ ] Ensure Freddy never presents calculations as legal advice or definitive
      immigration eligibility.
- [ ] Keep legal warnings and critical errors visually independent from Freddy.
- [ ] Provide accessible text for every Freddy expression or visual cue.
- [ ] Add a first-use explanation of local storage, backups, and legal limits.

## Privacy, resilience, and security

- [x] Test behaviour when browser storage is unavailable or full.
- [ ] Add the chosen contact email to `SECURITY.md` before public release.
- [ ] Test restoration from every supported older schema version.
- [x] Test IndexedDB migrations and interrupted writes.
- [ ] Test PIN setup, unlock, incorrect attempts, auto-lock, manual lock, and
      forgotten-PIN data reset.
- [ ] Test family-member isolation so records and calculations cannot be mixed.
- [ ] Test backup round trips and malicious or corrupted import files.
- [ ] Verify that no personal data is sent in network requests.

## Calculation correctness

- [x] Handle the pre-11-January-2018 transitional absence calculation separately.
- [x] Unit test every calculation rule and route configuration.
- [x] Test same-day travel, one-day travel, open trips, and overlapping trips.
- [x] Test leap years, month ends, year ends, and daylight-saving transitions.
- [x] Test visa gaps, route changes, and first-entry absence counting.
- [x] Test missing and contradictory information.
- [x] Complete a manual calculation review against current official GOV.UK rules.
- [x] Record the rules verification date in the release.

## UX and accessibility

- [ ] Create a dashboard showing progress, estimated eligibility date, absence
      status, and outstanding information.
- [ ] Add a visible lock-now action and configurable inactivity timeout.
      The lock-now action exists; configurable timeout remains pending.
- [ ] Create a chronological immigration and travel timeline.
- [ ] Add accessible success, warning, error, and manual-review states.
- [ ] Design appropriate loading, saving, empty, and corrupted-data states.
- [ ] Implement the original white, near-black, and neutral-grey brand tokens if
      still required; the current product uses the approved Ibiza Sunset Liquid
      Glass system.
- [ ] Keep buttons, navigation, charts, status surfaces, and illustrations other
      than Freddy monochrome if this remains a product requirement.
- [ ] Use Freddy’s natural fox palette only inside Freddy artwork if this remains
      a product requirement.
- [ ] Verify WCAG contrast for the supported light theme.
- [ ] Communicate success, warning, error, and review states with labels, icons,
      borders, and structure rather than relying on colour alone.
- [ ] Run automated accessibility checks.

## PWA, browser, and deployment resilience

- [ ] Test offline launch and service-worker updates.
- [ ] Test production output under the GitHub Pages subdirectory path.
- [ ] Add a restrictive Content Security Policy where GitHub Pages permits it.
- [ ] Add secure browser headers or document GitHub Pages limitations.
- [ ] Confirm no secrets, personal data, or test records are committed.
- [ ] Confirm proprietary licence and copyright notices appear in both the
      repository and application.
- [ ] Test install, offline use, update, backup, restore, and data deletion on
      supported mobile devices.
- [ ] Publish a versioned beta release with known limitations.
- [ ] Complete the legal-content review.
- [ ] Obtain professional legal review before describing the app as production ready.

## Later releases

These require separately verified route configurations or product scope:

- [ ] Skilled Worker dependant partners: reconcile this historical item with the
      dependant calculation support already present before either closing or
      redefining it.
- [ ] Long Residence, including the 11 April 2024 transitional absence rules.
- [ ] Family partner and parent five-year and ten-year routes.
- [ ] Global Talent three-year and five-year routes.
- [ ] Hong Kong BNO, UK Ancestry, Scale-up, and other settlement routes.
- [ ] Optional local reminders and calendar integration.
- [ ] Additional countries only after creating independent legal-rule engines.

## Explicitly out of scope for the first release

- Online accounts, server authentication, or cross-device synchronisation.
- A remote database or server-side storage.
- Automated legal advice or a guarantee of eligibility.
- Automatically approving exceptional absences.
- Advertising, analytics, behavioural tracking, or sale of user data.
- Collaboration, public profiles, or sharing records with third parties.
