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
- Avoid inline presentation styles. Runtime layout values may be passed through CSS custom properties only.
- Never interpolate untrusted user content into HTML strings. Use DOM properties such as `textContent` for user-controlled values.

## CSS architecture

`src/styles.css` is an ordered entrypoint only. Do not add rules directly to it.

- `src/styles/foundation.css`: reset, tokens, global primitives, older shared foundation styles.
- `src/styles/components/navigation.css`: desktop/mobile primary navigation and ILR hero states.
- `src/styles/application.css`: feature and page styles that have not yet been promoted to a dedicated shared component.
- `src/styles/components/liquid-glass-dialog.css`: the shared Ibiza Sunset Liquid Glass modal system.

When a component becomes genuinely reusable, move its styles from `application.css` into a focused file under `src/styles/components/` and keep the import order deliberate.

## Design system rules

- Use existing colour, spacing, radius, glass, and Ibiza variables before adding literals.
- Dark-theme behaviour should be expressed through shared variables or the owning component stylesheet, not scattered overrides.
- Prefer low-specificity class selectors. Do not use IDs for styling.
- Do not add `!important`. Five legacy declarations remain temporarily; the automated check prevents that number from increasing, and shared navigation/dialog modules allow none.
- Avoid duplicate feature-specific copies of common controls, cards, dialogs, navigation, or buttons.
- Keep responsive rules with the component they modify.
- Preserve reduced-motion behaviour for animated interactions.

## Verification

`npm run check` includes `npm run lint:frontend`, which validates the stylesheet architecture, the current specificity-debt budget, shared dialog usage, key HTML semantics, explicit button types, image alt attributes, and inline-style rules.

Playwright remains responsible for behaviour, responsive regressions, and critical accessibility-facing interactions. Prettier remains the formatter for HTML, CSS, TypeScript, and configuration files.
