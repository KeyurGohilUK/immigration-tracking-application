import { APP_NAME } from "../configuration/app-metadata";
import {
  populatePersonSwitcher,
  renderPersonSwitcherMarkup,
} from "../features/household/components/person-switcher";
import type { FamilyMember } from "../features/household/domain/family-member";
import type { OwnerProfile } from "../features/household/domain/owner-profile";

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
          <span class="device-storage-indicator" title="Data stored on this device">
            <svg aria-hidden="true" viewBox="0 0 24 24"><path d="M5 8.5h14v10H5zM8 8.5V6a4 4 0 0 1 8 0v2.5" /></svg>
            <span>On this device</span>
          </span>
          <button class="icon-button" type="button" aria-label="Lock app">
            <span aria-hidden="true">⌑</span>
          </button>
        </div>
      </header>

      ${mainContent}

      ${renderNavigation("mobile-navigation", activeNavigation)}

    </div>
  `;
  window.scrollTo({ top: 0, left: 0 });
}

export function renderApp(
  root: HTMLElement,
  owner: OwnerProfile,
  members: FamilyMember[],
  selectedProfileId: string,
): void {
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
            <p>Welcome back, <strong id="owner-name"></strong>.</p>
            <h1 id="welcome-title">Let’s organise your ILR journey.</h1>
            <p class="welcome-description">
              I’ll help you record your household, immigration permissions, and trips—all stored
              locally on this device.
            </p>
            ${renderPersonSwitcherMarkup()}
          </div>
        </section>

        <aside class="notice" aria-labelledby="notice-title">
          <span class="notice-icon" aria-hidden="true">i</span>
          <div>
            <h2 id="notice-title">Tracking estimate—not legal advice</h2>
            <p>Always verify current GOV.UK guidance and obtain qualified advice before applying.</p>
          </div>
        </aside>

        <section id="absence-summary" class="setup-card absence-summary" aria-labelledby="absence-summary-title" aria-live="polite">
          <div class="section-heading">
            <div>
              <p class="eyebrow">Official-rule absence check</p>
              <h2 id="absence-summary-title">Reviewing recorded absences…</h2>
            </div>
          </div>
          <p>This check stays on your device and does not determine ILR eligibility.</p>
          <div class="dashboard-actions"><button id="manage-permissions" class="secondary-button" type="button">Immigration history</button><button id="manage-trips" class="primary-button" type="button">Manage trips</button></div>
        </section>
      </main>`,
  );
  const ownerNameElement = root.querySelector<HTMLElement>("#owner-name");
  if (ownerNameElement) ownerNameElement.textContent = owner.fullName;
  populatePersonSwitcher(root, owner, members, selectedProfileId);
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
