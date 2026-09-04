import { APP_NAME } from "../configuration/app-metadata";
import type { HouseholdMember } from "../features/household/domain/household-member";
import { renderHouseholdMemberDialogMarkup } from "../features/household/components/member-profile-dialog";

const navigationItems = [
  {
    id: "Home",
    label: "Family",
    icon: '<circle cx="9" cy="8" r="3" /><circle cx="17" cy="9" r="2.5" /><path d="M3 20c0-4 2.5-6 6-6s6 2 6 6M14 15c3.5-.5 6 1.2 7 4.5" />',
  },
  {
    id: "Trips",
    label: "Travel",
    icon: '<path d="m3 11 18-7-7 18-2.5-8.5ZM11.5 13.5 21 4" />',
  },
  {
    id: "ILR",
    label: "ILR",
    icon: '<path d="M12 3 5 7v5c0 4.4 2.7 7.5 7 9 4.3-1.5 7-4.6 7-9V7Z" /><path d="m8.5 12 2.2 2.2 4.8-5" />',
  },
  {
    id: "Documents",
    label: "Vault",
    icon: '<path d="M6 3h9l4 4v14H6Z" /><path d="M15 3v5h4M9 12h7M9 16h7" />',
  },
  {
    id: "More",
    label: "Profile",
    icon: '<circle cx="12" cy="8" r="3" /><path d="M5 20c0-4.2 2.8-6.5 7-6.5s7 2.3 7 6.5" />',
  },
] as const;

export type NavigationId =
  (typeof navigationItems)[number]["id"] | "Permissions";

let previousMobileNavigationIndex = 0;

function resolvePrimaryNavigationId(
  activeNavigation: NavigationId,
): (typeof navigationItems)[number]["id"] {
  if (activeNavigation === "Permissions") return "Home";
  return activeNavigation;
}

function getPrimaryNavigationIndex(activeNavigation: NavigationId): number {
  const resolvedNavigation = resolvePrimaryNavigationId(activeNavigation);
  const index = navigationItems.findIndex(
    ({ id }) => id === resolvedNavigation,
  );
  return Math.max(index, 0);
}

function renderNavigation(
  className: string,
  activeNavigation: NavigationId,
): string {
  const resolvedNavigation = resolvePrimaryNavigationId(activeNavigation);
  const isMobile = className.includes("mobile-navigation");
  const indicator = isMobile
    ? '<span class="mobile-navigation-indicator" aria-hidden="true"></span>'
    : "";
  const navigationStyle = isMobile
    ? `style="--mobile-navigation-offset: ${previousMobileNavigationIndex * 100}%"`
    : "";
  const heroClass = resolvedNavigation === "ILR" ? " is-hero-active" : "";
  const heroGradientId = `${isMobile ? "mobile" : "desktop"}-ilr-icon-gradient`;

  return `
    <nav class="primary-navigation ${className}${heroClass}" aria-label="Primary navigation" ${navigationStyle}>
      ${indicator}
      ${navigationItems
        .map(
          ({ id, label, icon }) => `
            <a href="#${id.toLowerCase()}" data-navigation="${id}" ${id === resolvedNavigation ? 'aria-current="page"' : ""}>
              <svg aria-hidden="true" viewBox="0 0 24 24">${
                id === "ILR"
                  ? `<defs><linearGradient id="${heroGradientId}" x1="5" y1="4" x2="19" y2="20" gradientUnits="userSpaceOnUse"><stop stop-color="#ee0979"/><stop offset="1" stop-color="#ff6a00"/></linearGradient></defs><g class="navigation-hero-icon">${icon}</g>`
                  : icon
              }</svg>
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
          <img class="wordmark-logo" src="./brand-logo.png" alt="" />
          <span>${APP_NAME}</span>
        </a>
        ${renderNavigation("desktop-navigation", activeNavigation)}
        <div class="header-actions">
          <button class="icon-button" type="button" aria-label="Lock app" title="Lock app">
            <svg aria-hidden="true" viewBox="0 0 24 24"><rect x="5" y="10" width="14" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3" /></svg>
          </button>
        </div>
      </header>

      ${mainContent}

      ${renderNavigation("mobile-navigation", activeNavigation)}
    </div>
  `;
  const targetNavigationIndex = getPrimaryNavigationIndex(activeNavigation);
  const mobileNavigation =
    root.querySelector<HTMLElement>(".mobile-navigation");
  if (mobileNavigation) {
    previousMobileNavigationIndex = Math.max(
      Math.min(previousMobileNavigationIndex, navigationItems.length - 1),
      0,
    );
    mobileNavigation.style.setProperty(
      "--mobile-navigation-offset",
      `${previousMobileNavigationIndex * 100}%`,
    );
    previousMobileNavigationIndex = targetNavigationIndex;
    requestAnimationFrame(() => {
      mobileNavigation.style.setProperty(
        "--mobile-navigation-offset",
        `${targetNavigationIndex * 100}%`,
      );
    });
  }
  window.scrollTo({ top: 0, left: 0 });
}

export function renderApp(
  root: HTMLElement,
  members: HouseholdMember[],
  selectedProfileId: string,
): void {
  const mainApplicants = members.filter(
    ({ immigrationRole }) => immigrationRole === "main-applicant",
  ).length;
  const dependants = members.filter(
    ({ immigrationRole }) => immigrationRole === "dependant",
  ).length;
  const configuredProfiles = mainApplicants + dependants;
  renderAppShell(
    root,
    "Home",
    `<main id="main-content" class="cohort-page dashboard-main family-dashboard">
      <section class="family-summary-card glass-panel-floating" aria-labelledby="family-overview-title">
        <div class="family-summary-edge" aria-hidden="true"></div>
        <p class="eyebrow">Household overview</p>
        <h1 id="family-overview-title">Family Overview</h1>
        <p>Manage household profiles and review each person’s recorded ILR information.</p>
        <dl class="family-summary-metrics">
          <div><dt>Household profiles</dt><dd><strong>${members.length}</strong><small>Stored encrypted on this device</small></dd></div>
          <div><dt>Immigration roles set</dt><dd><strong>${configuredProfiles} of ${members.length}</strong><small>${mainApplicants} main applicant · ${dependants} ${dependants === 1 ? "dependant" : "dependants"}</small></dd></div>
        </dl>
      </section>

      <button id="manage-family" class="primary-button dashboard-add-member" type="button">
        <span class="dashboard-add-member-icon" aria-hidden="true">＋</span>
        <span>Add Household Member</span>
      </button>

      <section class="household-status-card glass-panel" aria-labelledby="household-status-title">
        <div class="household-status-glow" aria-hidden="true"></div>
        <div>
          <div class="household-status-label">
            <span class="household-status-icon" aria-hidden="true">⌂</span>
            <h2 id="household-status-title">Selected profile check</h2>
          </div>
          <div class="household-status-main">
            <strong id="household-status-value">Checking…</strong>
            <span class="household-status-chip"><span id="household-status-copy">Reviewing recorded history</span></span>
          </div>
        </div>
        <div class="household-total-absence">
          <span>Maximum recorded absence</span>
          <strong id="household-total-absence">—</strong>
          <small>complete days in one rolling year</small>
        </div>
      </section>

      <section class="family-member-stack" aria-labelledby="family-members-title">
        <div class="family-member-heading"><div><p class="eyebrow">Household cohort</p><h2 id="family-members-title">Active members</h2></div><span>${members.length} ${members.length === 1 ? "profile" : "profiles"}</span></div>
        <div id="dashboard-family-list" class="dashboard-family-list"></div>
      </section>

      <section id="absence-summary" class="setup-card absence-summary family-dashboard-absence" aria-labelledby="absence-summary-title" aria-live="polite">
        <div class="section-heading">
          <div>
            <p class="eyebrow">Selected member</p>
            <h2 id="absence-summary-title">Reviewing recorded history…</h2>
          </div>
        </div>
        <p>This check stays on your device and does not determine ILR eligibility.</p>
        <div class="dashboard-actions">
          <button id="manage-permissions" class="secondary-button" type="button">Immigration history</button>
          <button id="manage-trips" class="primary-button" type="button">Manage trips</button>
        </div>
      </section>

      <aside class="notice dashboard-notice" aria-labelledby="notice-title">
        <span class="notice-icon" aria-hidden="true">i</span>
        <div>
          <h2 id="notice-title">Tracking estimate—not legal advice</h2>
          <p>Always verify current GOV.UK guidance and obtain qualified advice before applying.</p>
        </div>
      </aside>
    </main>
    ${renderHouseholdMemberDialogMarkup()}`,
  );

  const familyList = root.querySelector<HTMLElement>("#dashboard-family-list");
  for (const member of members) {
    const role =
      member.immigrationRole === "main-applicant"
        ? "Main applicant"
        : member.immigrationRole === "dependant"
          ? "Dependant"
          : "Immigration role not set";
    familyList?.append(
      createDashboardProfileCard(
        member.fullName,
        role,
        member.id,
        selectedProfileId === member.id,
      ),
    );
  }
}

function createDashboardProfileCard(
  name: string,
  role: string,
  profileId: string,
  selected: boolean,
): HTMLElement {
  const button = document.createElement("button");
  button.type = "button";
  button.className = "dashboard-person-card family-overview-member";
  if (selected) button.classList.add("is-selected");
  button.dataset.editDashboardMember = profileId;
  button.setAttribute("aria-label", `Edit ${name}`);
  button.innerHTML = `
    <span class="dashboard-person-avatar" aria-hidden="true"></span>
    <span class="dashboard-person-copy">
      <span class="dashboard-person-heading"><strong></strong><span class="dashboard-person-badge"></span></span>
      <small>${selected ? "Selected tracking profile" : "Household profile"}</small>
    </span>
    <span class="dashboard-person-state">
      <span class="dashboard-person-limit-value">Edit</span><span aria-hidden="true">›</span>
    </span>
  `;
  const avatar = button.querySelector<HTMLElement>(".dashboard-person-avatar");
  const heading = button.querySelector<HTMLElement>("strong");
  const badge = button.querySelector<HTMLElement>(".dashboard-person-badge");
  if (avatar)
    avatar.textContent =
      name
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part.charAt(0).toUpperCase())
        .join("") || "?";
  if (heading) heading.textContent = name;
  if (badge) badge.textContent = role;
  return button;
}

export function renderSplash(root: HTMLElement): void {
  root.innerHTML = `
    <main class="splash-screen" aria-label="UrbanFox ILR is starting">
      <img class="splash-logo" src="./brand-logo.png" alt="" />
      <p class="eyebrow">Freddy the Urban Fox</p>
      <h1>${APP_NAME}</h1>
      <p>Preparing your private space…</p>
    </main>
  `;
}
