# Releases and What’s new

UrbanFox ILR uses semantic versions for application releases:

- Patch (`0.11.1`) for backward-compatible bug fixes and small visual changes.
- Minor (`0.12.0`) for backward-compatible features and meaningful user-facing
  improvements.
- Major (`1.0.0`, `2.0.0`) for a production milestone or deliberately breaking
  changes such as incompatible data or backup formats.

Every release PR must update the version in
`src/configuration/release-metadata.ts`, `public/release.json`, and
`public/service-worker.js`. Changing the service-worker cache version ensures
installed apps can download the new application shell without deleting local
IndexedDB records.

`RELEASE_NOTES` and `public/release.json` contain only the changes introduced by
that version. They drive the current **What’s new** section and are not a full
changelog. GitHub pull requests and releases retain the historical record.

Run `npm run check` before opening a PR. The release check rejects mismatched
versions, empty notes, and differences between the local fallback notes and the
public release notes.
