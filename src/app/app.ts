import { APP_NAME } from "../configuration/app-metadata";
import {
  populatePersonSwitcher,
  renderPersonSwitcherMarkup,
} from "../features/household/components/person-switcher";
import type { FamilyMember } from "../features/household/domain/family-member";
import type { OwnerProfile } from "../features/household/domain/owner-profile";

const navigationItems = [
  {
    id: "Home",
    label: "Dashboard",
    icon: '<path d="M3 11.5 12 4l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1Z" />',
  },
  {
    id: "Family",
    label: "Family",
    icon: '<circle cx="9" cy="8" r="3" /><circle cx="17" cy="9" r="2.5" /><path d="M3 20c0-4 2.5-6 6-6s6 2 6 6M14 15c3.5-.5 6 1.2 7 4.5" />',
  },
  {
    id: "Trips",
    label: "Travel",
    icon: '<path d="m3 11 18-7-7 18-2.5-8.5ZM11.5 13.5 21 4" />',
  },
  {
    id: "Documents",
    label: "Documents",
    icon: '<path d="M6 3h9l4 4v14H6Z" /><path d="M15 3v5h4M9 12h7M9 16h7" />',
  },
  {
    id: "More",
    label: "Profile",
    icon: '<circle cx="12" cy="8" r="3" /><path d="M5 20c0-4.2 2.8-6.5 7-6.5s7 2.3 7 6.5" />',
  },
] as const;

export type NavigationId = (typeof navigationItems)[number]["id"];

function renderNavigation(
  className: string,
  activeNavigation: NavigationId,
): string {
  return `
    <nav class="primary-navigation ${className}" aria-label="Primary navigation">
      ${navigationItems
        .map(
          ({ id, label, icon }) => `
            <a href="#${id.toLowerCase()}" data-navigation="${id}" ${id === activeNavigation ? 'aria-current="page"' : ""}>
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
    `<main id="main-content" class="main-content dashboard-main">
        <section class="dashboard-intro" aria-labelledby="welcome-title">
          <div>
            <p class="eyebrow">Private household tracker</p>
            <h1 id="welcome-title">Household ILR overview</h1>
            <p class="welcome-description">Welcome back, <strong id="owner-name"></strong>. Review each person separately so immigration and travel records are never combined.</p>
          </div>
          <div class="freddy-placeholder" aria-label="Freddy the Urban Fox artwork is coming soon"><span aria-hidden="true">F</span></div>
        </section>

        <section class="dashboard-profile-picker">
          ${renderPersonSwitcherMarkup()}
        </section>

        <section id="absence-summary" class="setup-card absence-summary" aria-labelledby="absence-summary-title" aria-live="polite">
          <div class="section-heading">
            <div>
              <p class="eyebrow">Official-rule residence tracker</p>
              <h2 id="absence-summary-title">Reviewing recorded history…</h2>
            </div>
          </div>
          <p>This check stays on your device and does not determine ILR eligibility.</p>
          <div class="dashboard-actions"><button id="manage-permissions" class="secondary-button" type="button">Immigration history</button><button id="manage-trips" class="primary-button" type="button">Manage trips</button></div>
        </section>

        <section class="dashboard-household" aria-labelledby="dashboard-household-title">
          <div class="section-heading"><div><p class="eyebrow">Local household</p><h2 id="dashboard-household-title">Household profiles</h2></div><span class="step-count">${members.length + 1} ${members.length === 0 ? "person" : "people"}</span></div>
          <div id="dashboard-family-list" class="dashboard-family-list"></div>
          <button id="manage-family" class="secondary-button dashboard-family-action" type="button">Manage family members</button>
        </section>

        <aside class="notice dashboard-notice" aria-labelledby="notice-title">
          <span class="notice-icon" aria-hidden="true">i</span>
          <div><h2 id="notice-title">Tracking estimate—not legal advice</h2><p>Always verify current GOV.UK guidance and obtain qualified advice before applying.</p></div>
        </aside>
      </main>`,
  );
  const ownerNameElement = root.querySelector<HTMLElement>("#owner-name");
  if (ownerNameElement) ownerNameElement.textContent = owner.fullName;
  populatePersonSwitcher(root, owner, members, selectedProfileId);
  const familyList = root.querySelector<HTMLElement>("#dashboard-family-list");
  familyList?.append(
    createDashboardProfileCard(
      owner.fullName,
      "You · Household owner",
      owner.id,
      selectedProfileId === owner.id,
    ),
  );
  for (const member of members) {
    familyList?.append(
      createDashboardProfileCard(
        member.fullName,
        getDashboardMemberContext(member),
        member.id,
        selectedProfileId === member.id,
      ),
    );
  }
}

function getDashboardMemberContext(member: FamilyMember): string {
  const relationship =
    member.relationship === "spouse-or-partner"
      ? "Spouse or partner"
      : member.relationship.charAt(0).toUpperCase() +
        member.relationship.slice(1);
  const role =
    member.immigrationRole === "main-applicant"
      ? "Main applicant"
      : member.immigrationRole === "dependant"
        ? "Dependant"
        : "Role not set";
  return `${relationship} · ${role}`;
}

function createDashboardProfileCard(
  name: string,
  context: string,
  profileId: string,
  selected: boolean,
): HTMLElement {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "dashboard-person-card";
  if (selected) button.classList.add("is-selected");
  button.dataset.selectDashboardProfile = profileId;
  button.setAttribute("aria-label", `${selected ? "Viewing" : "View"} ${name}`);
  button.innerHTML = `<span class="dashboard-person-avatar" aria-hidden="true"></span><span class="dashboard-person-copy"><strong></strong><small></small></span><span class="dashboard-person-state"></span>`;
  const avatar = button.querySelector<HTMLElement>(".dashboard-person-avatar");
  const heading = button.querySelector<HTMLElement>("strong");
  const description = button.querySelector<HTMLElement>("small");
  const state = button.querySelector<HTMLElement>(".dashboard-person-state");
  if (avatar) avatar.textContent = name.trim().charAt(0).toUpperCase() || "?";
  if (heading) heading.textContent = name;
  if (description) description.textContent = context;
  if (state) state.textContent = selected ? "Viewing" : "Open";
  return button;
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
