import { renderAppShell } from "../../../app/app";
import { APP_VERSION } from "../../../configuration/release-metadata";

export function renderMorePage(root: HTMLElement): void {
  renderAppShell(
    root,
    "More",
    `<main id="main-content" class="more-main">
      <header class="more-heading">
        <p class="eyebrow">Your private space</p>
        <h1>More</h1>
        <p>Manage this device, review important information, and keep your local records safe.</p>
      </header>

      <div class="more-grid">
        <section class="more-card" aria-labelledby="local-data-title">
          <div class="more-card-heading">
            <span class="more-card-icon" aria-hidden="true">⌂</span>
            <div><p class="eyebrow">Data and privacy</p><h2 id="local-data-title">Stored only on this device</h2></div>
          </div>
          <p>Your household, permission, and travel records are stored in this browser and encrypted while the app is locked.</p>
          <p class="local-data-banner"><strong>No online account or app database.</strong> Clearing browser data, uninstalling the app, or losing this device can remove your records.</p>
        </section>

        <section class="more-card" aria-labelledby="backup-title">
          <div class="more-card-heading">
            <span class="more-card-icon" aria-hidden="true">⇩</span>
            <div><p class="eyebrow">Data safety</p><h2 id="backup-title">Backup and restore</h2></div>
          </div>
          <p>Encrypted downloadable backups are planned but are not available yet. Until then, avoid clearing this site’s browser data.</p>
          <span class="step-count">Coming next</span>
        </section>

        <section class="more-card" aria-labelledby="security-title">
          <div class="more-card-heading">
            <span class="more-card-icon" aria-hidden="true">⌑</span>
            <div><p class="eyebrow">Security</p><h2 id="security-title">Lock this private space</h2></div>
          </div>
          <p>Lock UrbanFox before handing your device to someone else. Your four-digit PIN will be required to reopen it.</p>
          <button id="lock-from-more" class="secondary-button more-action" type="button">Lock now</button>
        </section>

        <section class="more-card" aria-labelledby="legal-title">
          <div class="more-card-heading">
            <span class="more-card-icon" aria-hidden="true">i</span>
            <div><p class="eyebrow">Important information</p><h2 id="legal-title">Terms, privacy, and licence</h2></div>
          </div>
          <p>Review the tracking-only disclaimer, local privacy notice, app information, and proprietary licence.</p>
          <button id="view-legal" class="secondary-button more-action" type="button">View legal information</button>
        </section>
      </div>

      <p class="more-version">UrbanFox ILR version ${APP_VERSION}</p>
    </main>`,
  );
}
