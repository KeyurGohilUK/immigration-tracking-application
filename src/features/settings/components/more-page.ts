import { renderAppShell } from "../../../app/app";
import { APP_VERSION } from "../../../configuration/release-metadata";
import { renderDeleteDataDialog } from "./delete-data-dialog";

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
          <button id="restore-backup" class="secondary-button more-action" type="button">Restore encrypted backup</button>
          <p id="backup-status" class="more-card-status" role="status"></p>
          <p class="field-guidance">Keep each backup file and its password somewhere safe and separate.</p>
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

        <section class="more-card danger-zone" aria-labelledby="delete-data-title">
          <div class="more-card-heading">
            <span class="more-card-icon" aria-hidden="true">×</span>
            <div><p class="eyebrow">Danger Zone</p><h2 id="delete-data-title">Delete all local data</h2></div>
          </div>
          <p>Permanently remove this household, every family member, permission and trip, the local PIN, and Terms acceptance from this browser.</p>
          <p class="local-data-banner danger-warning"><strong>This cannot be undone.</strong> Create and safely store an encrypted backup first if you may need these records again.</p>
          <button id="open-delete-data" class="secondary-button more-action danger-button" type="button">Delete all local data</button>
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
    </dialog>
    <dialog id="restore-dialog" class="family-dialog" aria-labelledby="restore-dialog-title">
      <form id="restore-form" class="family-form" novalidate>
        <div class="app-manager-heading"><div><p class="eyebrow">Replace-only restore</p><h2 id="restore-dialog-title">Restore a backup</h2></div><button class="dialog-close" type="button" aria-label="Close restore form">×</button></div>
        <p id="restore-guidance">Choose an UrbanFox encrypted JSON backup and enter its separate backup password. Nothing changes until you review and confirm.</p>
        <label for="restore-file">Encrypted backup file</label>
        <input id="restore-file" name="backupFile" type="file" accept="application/json,.json" aria-describedby="restore-guidance" required />
        <label for="restore-password">Restore backup password</label>
        <input id="restore-password" name="password" type="password" minlength="12" autocomplete="current-password" required />
        <p id="restore-form-error" class="form-error" role="alert" hidden></p>
        <button id="review-backup" class="primary-button" type="submit">Review backup</button>
        <section id="restore-summary" class="restore-summary" aria-labelledby="restore-summary-title" hidden>
          <p class="eyebrow">Validated backup</p>
          <h3 id="restore-summary-title">Review before replacing data</h3>
          <p id="restore-owner"></p>
          <dl class="restore-counts"><div><dt>People</dt><dd id="restore-people"></dd></div><div><dt>Permissions</dt><dd id="restore-permissions"></dd></div><div><dt>Trips</dt><dd id="restore-trips"></dd></div></dl>
          <p id="restore-exported"></p>
          <p class="local-data-banner"><strong>This replaces all current household records.</strong> Create a fresh backup first if you may need the data currently on this device.</p>
          <label class="checkbox-field" for="restore-confirmation"><input id="restore-confirmation" type="checkbox" /><span><strong>I understand this replaces my current local records</strong></span></label>
          <button id="replace-local-data" class="primary-button" type="button" disabled>Replace local data</button>
        </section>
      </form>
    </dialog>
    ${renderDeleteDataDialog("unlocked")}`,
  );
}
