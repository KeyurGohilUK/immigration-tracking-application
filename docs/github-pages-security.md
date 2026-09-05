# GitHub Pages security controls

UrbanFox ILR is deployed as a static Progressive Web App on GitHub Pages.

## Controls enforced by the application

The production HTML includes a Content Security Policy meta directive that:

- allows scripts only from the deployed application origin;
- allows network connections only to the deployed application origin;
- allows styles from the application and the existing Google Fonts stylesheet origin;
- allows fonts from the existing Google Fonts asset origin;
- blocks plugins/embedded objects;
- restricts base URLs, manifests, workers, and form submissions to the application origin;
- permits local blob/data images required for encrypted-document previews;
- permits inline style attributes because the current UI sets layout values dynamically.

The document also sets a no-referrer policy.

Pull-request CI serves the built `dist` directory under
`/immigration-tracking-application/`, verifies all local assets stay below that
repository path, checks the manifest and update manifest, verifies service-worker
scope, and performs a real offline reload.

## GitHub Pages response-header limitation

GitHub Pages does not provide repository-level configuration for arbitrary HTTP
response headers. UrbanFox therefore cannot directly set deployment headers such
as `Content-Security-Policy`, `Permissions-Policy`,
`X-Content-Type-Options`, or a custom `Strict-Transport-Security` value at the
origin.

The CSP is consequently enforced with an HTML meta directive. Some directives,
including `frame-ancestors`, are not available through a meta-delivered CSP and
must not be claimed as enforced.

If stronger response-header control becomes a release requirement, move the
static deployment behind a host/CDN that supports custom response headers and
re-test the PWA update/service-worker behaviour there.

## Repository safety checks

CI scans tracked files for high-confidence secret formats, committed environment
files/private-key containers, generated UrbanFox backup files, and known
synthetic test identities escaping test-only files. Synthetic fixtures remain
allowed inside unit and browser tests.

This automated check is a guardrail, not a substitute for code review when new
credentials, providers, or deployment infrastructure are introduced.
