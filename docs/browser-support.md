# Browser support

UrbanFox ILR is a mobile-first, local-only Progressive Web App. Browser support
is intentionally conservative because the app depends on reliable Web Crypto,
IndexedDB, service workers, modern CSS, and file APIs for encrypted local data,
offline use, backup, restore, and Document Vault workflows.

## Supported browsers

The minimum supported versions are:

| Platform      | Browser        | Minimum version | PWA install                                                               |
| ------------- | -------------- | --------------: | ------------------------------------------------------------------------- |
| iPhone / iPad | Safari         |            17.4 | Yes, through Add to Home Screen                                           |
| Android       | Chrome         |             121 | Yes                                                                       |
| Windows       | Chrome         |             121 | Yes                                                                       |
| Windows       | Microsoft Edge |             121 | Yes                                                                       |
| macOS         | Safari         |            17.4 | Supported as a browser; installation depends on the OS/browser capability |
| macOS         | Chrome         |             121 | Yes                                                                       |
| Desktop       | Firefox        |             122 | Browser use only; install is not part of the supported PWA path           |

The project targets these versions or newer. Older versions may appear to work
but are not part of the supported test or release baseline.

## Required browser capabilities

A supported browser must provide all of the following:

- Web Crypto with AES-GCM and PBKDF2.
- IndexedDB with reliable transaction support.
- Service workers and Cache Storage.
- Blob, File, FileReader, URL and download APIs used by backup and Document
  Vault workflows.
- Modern JavaScript modules and ES2022 syntax.
- CSS features used by the Ibiza Sunset Liquid Glass interface, including
  `color-mix()`, backdrop filtering, custom properties and modern layout.

If any required storage or cryptographic capability is unavailable, disabled by
policy, blocked by private-browsing restrictions, or exhausted, UrbanFox should
show an explicit data/storage problem state rather than silently continuing.

## Mobile support policy

The first public release is intended for current iPhone/iPad Safari and current
Android Chrome devices. Release testing should cover, at minimum:

- installation / Add to Home Screen;
- first launch and unlock;
- offline relaunch;
- application update;
- encrypted backup creation;
- encrypted restore;
- Document Vault file handling;
- local-data deletion;
- inactivity auto-lock and manual lock.

The active roadmap keeps physical-device validation separate from automated
browser testing. A browser being listed here does not mean every device/OS
combination has already completed the manual release checklist.

## Unsupported environments

The following are not supported for the first release:

- Internet Explorer or legacy EdgeHTML;
- embedded in-app browsers and social-media webviews;
- browsers with JavaScript disabled;
- browsers or managed devices where Web Crypto, IndexedDB, service workers, or
  local file operations are disabled;
- private/incognito modes that do not provide durable local storage;
- browser versions below the minimum versions listed above.

## Automated coverage

Pull-request CI currently exercises the application with Playwright Chromium on
desktop and mobile profiles, plus the built GitHub Pages PWA path. Safari/WebKit
and physical-device checks are therefore release-validation responsibilities
until they are added to CI explicitly.

When the minimum supported versions change, update this document, the active
roadmap, and any release notes or user-facing compatibility guidance that refer
to the support baseline.
