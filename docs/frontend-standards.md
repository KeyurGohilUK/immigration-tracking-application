# Frontend standards

UrbanFox ILR uses semantic HTML, accessible native controls, and an Ibiza Sunset Liquid Glass design system. New UI work should extend these shared patterns rather than introducing feature-local alternatives.

## HTML

- Prefer semantic landmarks such as `header`, `nav`, `main`, `section`, `aside`, and `footer`.
- Keep one page-level `main` landmark in each rendered view and maintain a logical heading hierarchy.
- Use native `button`, `a`, `input`, `select`, `textarea`, and `dialog` elements before custom interaction patterns.
- Every button must declare its `type`.
- Form fields need visible labels or an equivalent accessible name.
- Images must always declare `alt`; decorative images use `alt=""`.
- Decorative SVGs should be hidden from assistive technology.
- Do not add raw `<dialog>` markup in feature code. Use `src/shared/components/liquid-glass-dialog.ts` so behaviour, accessibility, viewport positioning, and theme treatment remain consistent.
- Use native `<details>`/`<summary>` for expandable sections. Global disclosure motion is provided by `src/app/disclosure-motion.ts`; do not add feature-specific open/close animations that bypass reduced-motion handling.
- Avoid inline presentation styles. Runtime layout values may be passed through CSS custom properties only.
- Never interpolate untrusted user content into HTML strings. Use DOM properties such as `textContent` for user-controlled values.
- Keep domain rules such as readiness/status calculations outside rendering components. UI components consume typed domain results rather than duplicating business logic.

## CSS architecture

`src/styles.css` is an ordered entrypoint only. Do not add rules directly to it.

Shared foundations:

- `src/styles/tokens-base.css`: Ibiza tokens, reset, base document rules, and reduced-motion accessibility.
- `src/styles/theme-dark.css`: central dark-theme token aliases and shared dark overrides.

Shared components:

- `src/styles/components/app-shell.css`: app shell and top bar.
- `src/styles/components/install-manager.css`: install/update controls.
- `src/styles/components/navigation.css`: all desktop/mobile primary navigation behaviour.
- `src/styles/components/forms.css` and `form-controls.css`: shared form primitives.
- `src/styles/components/dialog-compat.css`: compatibility rules for older dialog markup while migration completes.
- `src/styles/components/liquid-glass-dialog.css`: shared Ibiza Sunset Liquid Glass modal system.

Feature/page modules live under `src/styles/pages/` and own their base, responsive, and feature-specific states. Current modules include public, legal, security, dashboard, setup, records, documents, household, ILR, member editor, and travel.

Do not recreate catch-all files such as `foundation.css` or `application.css`. When a component becomes reusable, move it to `components/` and keep the import order deliberate.

## Design system rules

- Ibiza Sunset Liquid Glass is the single visual system for both light and dark themes. The legacy black-and-white light palette is retired.
- Use existing colour, spacing, radius, glass, and Ibiza variables before adding literals.
- Light-theme foundation colours must flow from the Ibiza tokens in `tokens-base.css`; do not reintroduce `#000000` or `#111111` as UI colours.
- Dark-theme behaviour should be expressed through shared variables or the owning component stylesheet, not scattered overrides.
- Prefer low-specificity class selectors. Do not use IDs for styling.
- Do not add `!important`. The only allowed uses are the four declarations in the central reduced-motion accessibility override.
- Avoid duplicate feature-specific copies of common controls, cards, dialogs, navigation, or buttons.
- ILR and Document Vault use the shared `.cohort-page` layout (`styles/components/cohort-page.css`) for page width, responsive padding, and section gaps. Keep these values out of the individual page stylesheets.
- ILR and Document Vault share `shared/components/household-selector.ts` and `progress-card.ts`, with styles under `styles/components/`. Pages supply their own progress calculations and labels; shared components only render them. Profile pills emit `profile-select`, handled by the authenticated app shell.
- Keep responsive rules with the component they modify.
- Keep each CSS module below 1,200 lines. Split by page or shared component before a module becomes another catch-all stylesheet.
- Preserve reduced-motion behaviour for animated interactions.

## Verification

`npm run check` includes `npm run lint:frontend`, which validates the stylesheet architecture, the current specificity-debt budget, shared dialog usage, key HTML semantics, explicit button types, image alt attributes, and inline-style rules.

Playwright remains responsible for behaviour, responsive regressions, and critical accessibility-facing interactions. Prettier remains the formatter for HTML, CSS, TypeScript, and configuration files.
