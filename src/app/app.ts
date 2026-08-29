import { APP_NAME } from "../configuration/app-metadata";

const navigationItems = [
  {
    label: "Home",
    icon: '<path d="M3 11.5 12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1Z" />',
  },
  {
    label: "Family",
    icon: '<circle cx="9" cy="8" r="3" /><circle cx="17" cy="9" r="2.5" /><path d="M3 20c0-4 2.5-6 6-6s6 2 6 6M14 15c3.5-.5 6 1.2 7 4.5" />',
  },
  {
    label: "Trips",
    icon: '<path d="m3 11 18-7-7 18-2.5-8.5ZM11.5 13.5 21 4" />',
  },
  {
    label: "More",
    icon: '<circle cx="5" cy="12" r="1" fill="currentColor" /><circle cx="12" cy="12" r="1" fill="currentColor" /><circle cx="19" cy="12" r="1" fill="currentColor" />',
  },
] as const;

export type NavigationId = (typeof navigationItems)[number]["label"];

function renderNavigation(
  className: string,
  activeNavigation: NavigationId,
): string {
  return `
    <nav class="primary-navigation ${className}" aria-label="Primary navigation">
      ${navigationItems
        .map(
          ({ label, icon }) => `
            <a href="#${label.toLowerCase()}" data-navigation="${label}" ${label === activeNavigation ? 'aria-current="page"' : ""}>
              <svg aria-hidden="true" viewBox="0 0 24 24">${icon}</svg>
              <span class="navigation-label">${label}</span>
            </a>`,
        )
        .join("")}
    </nav>
  `;
}

export function renderAppShell(
  root: HTMLElement,
  activeNavigation: NavigationId,
  mainContent: string,
): void {
  root.innerHTML = `
    <div class="app-shell">
      <header class="top-bar">
        <a class="wordmark" href="#home" aria-label="${APP_NAME} home">
          <span class="wordmark-mark" aria-hidden="true">UF</span>
          <span>${APP_NAME}</span>
        </a>
        ${renderNavigation("desktop-navigation", activeNavigation)}
        <div class="header-actions">
          <button class="icon-button" type="button" aria-label="Lock app">
            <span aria-hidden="true">⌑</span>
          </button>
        </div>
      </header>

      ${mainContent}

      ${renderNavigation("mobile-navigation", activeNavigation)}

    </div>
  `;
}

export function renderApp(root: HTMLElement, ownerName?: string): void {
  renderAppShell(
    root,
    "Home",
    `<main id="main-content" class="main-content">
        <section class="welcome-card" aria-labelledby="welcome-title">
          <div class="freddy-placeholder" aria-label="Freddy the Urban Fox artwork is coming soon">
            <span aria-hidden="true">F</span>
          </div>
          <div>
            <p class="eyebrow">Freddy the Urban Fox</p>
            ${ownerName ? '<p>Welcome back, <strong id="owner-name"></strong>.</p>' : ""}
            <h1 id="welcome-title">Let’s organise your ILR journey.</h1>
            <p>
              I’ll help you record your household, immigration permissions, and trips—all stored
              locally on this device.
            </p>
          </div>
        </section>

        <aside class="notice" aria-labelledby="notice-title">
          <span class="notice-icon" aria-hidden="true">i</span>
          <div>
            <h2 id="notice-title">Tracking estimate—not legal advice</h2>
            <p>Always verify current GOV.UK guidance and obtain qualified advice before applying.</p>
          </div>
        </aside>

        <section class="setup-card" aria-labelledby="setup-title">
          <div class="section-heading">
            <div>
              <p class="eyebrow">Private by design</p>
              <h2 id="setup-title">Start your local household</h2>
            </div>
            <span class="step-count">0 of 3</span>
          </div>
          <ol class="setup-list">
            <li><span aria-hidden="true">1</span><div><strong>Create a 4-digit PIN</strong><small>Lock access on this device</small></div></li>
            <li><span aria-hidden="true">2</span><div><strong>Add your household</strong><small>Keep each family member separate</small></div></li>
            <li><span aria-hidden="true">3</span><div><strong>Record immigration history</strong><small>Add permissions and UK arrival dates</small></div></li>
          </ol>
          <button class="primary-button" type="button" disabled>Setup coming next</button>
        </section>
      </main>`,
  );
  const ownerNameElement = root.querySelector<HTMLElement>("#owner-name");
  if (ownerNameElement && ownerName) ownerNameElement.textContent = ownerName;
}

export function renderSplash(root: HTMLElement): void {
  root.innerHTML = `
    <main class="splash-screen" aria-label="UrbanFox ILR is starting">
      <span class="splash-mark" aria-hidden="true">UF</span>
      <p class="eyebrow">Freddy the Urban Fox</p>
      <h1>${APP_NAME}</h1>
      <p>Preparing your private space…</p>
    </main>
  `;
}
