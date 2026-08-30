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
          <p>Download all current household records as one password-protected file. The backup password is separate from your four-digit PIN.</p>
          <button id="create-backup" class="primary-button more-action" type="button">Create encrypted backup</button>
          <p id="backup-status" class="more-card-status" role="status"></p>
          <p class="field-guidance">Restore will be added next. Keep the file and password somewhere safe and separate.</p>
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
    </main>
    <dialog id="backup-dialog" class="family-dialog" aria-labelledby="backup-dialog-title">
      <form id="backup-form" class="family-form" novalidate>
        <div class="app-manager-heading"><div><p class="eyebrow">Encrypted download</p><h2 id="backup-dialog-title">Create a backup</h2></div><button class="dialog-close" type="button" aria-label="Close backup form">×</button></div>
        <p id="backup-guidance">Use a unique password with at least 12 characters. UrbanFox cannot recover this password or open the backup without it.</p>
        <label for="backup-password">Backup password</label>
        <input id="backup-password" name="password" type="password" minlength="12" autocomplete="new-password" aria-describedby="backup-guidance" required />
        <label for="backup-password-confirmation">Confirm backup password</label>
        <input id="backup-password-confirmation" name="confirmation" type="password" minlength="12" autocomplete="new-password" required />
        <p id="backup-form-error" class="form-error" role="alert" hidden></p>
        <button class="primary-button" type="submit">Download encrypted backup</button>
      </form>
    </dialog>`,
  );
}
