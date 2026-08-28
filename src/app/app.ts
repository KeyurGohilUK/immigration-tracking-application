import { APP_NAME } from "../configuration/app-metadata";

const navigationItems = [
  { label: "Home", icon: "⌂" },
  { label: "Family", icon: "♙" },
  { label: "Trips", icon: "↗" },
  { label: "More", icon: "•••" },
] as const;

function renderNavigation(className: string): string {
  return `
    <nav class="primary-navigation ${className}" aria-label="Primary navigation">
      ${navigationItems
        .map(
          ({ label, icon }, index) => `
            <a href="#${label.toLowerCase()}" ${index === 0 ? 'aria-current="page"' : ""}>
              <span aria-hidden="true">${icon}</span>
              <span>${label}</span>
            </a>`,
        )
        .join("")}
    </nav>
  `;
}

export function renderApp(root: HTMLElement): void {
  root.innerHTML = `
    <div class="app-shell">
      <header class="top-bar">
        <a class="wordmark" href="#home" aria-label="${APP_NAME} home">
          <span class="wordmark-mark" aria-hidden="true">UF</span>
          <span>${APP_NAME}</span>
        </a>
        ${renderNavigation("desktop-navigation")}
        <div class="header-actions">
          <button id="install-app" class="install-button" type="button" hidden>Install app</button>
          <button class="icon-button" type="button" aria-label="Lock app" disabled>
            <span aria-hidden="true">⌑</span>
          </button>
        </div>
      </header>

      <main id="main-content" class="main-content">
        <section class="welcome-card" aria-labelledby="welcome-title">
          <div class="freddy-placeholder" aria-label="Freddy the Urban Fox artwork is coming soon">
            <span aria-hidden="true">F</span>
          </div>
          <div>
            <p class="eyebrow">Freddy the Urban Fox</p>
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
      </main>

      ${renderNavigation("mobile-navigation")}

    </div>
  `;
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
