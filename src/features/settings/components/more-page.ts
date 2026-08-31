import { renderAppShell } from "../../../app/app";
import { APP_VERSION } from "../../../configuration/release-metadata";
import { renderDeleteDataDialog } from "./delete-data-dialog";
import { getThemePreference } from "../services/theme-preference";

export function renderMorePage(
  root: HTMLElement,
  householdSize: number,
): void {
  renderAppShell(
    root,
    "More",
    `<main id="main-content" class="more-main profile-main">
      <header class="more-heading profile-heading">
        <p class="eyebrow">Your private space</p>
        <h1>Profile & settings</h1>
        <p>Manage this local household, device security, backups, and app information.</p>
      </header>

      <section class="profile-summary" aria-labelledby="profile-name">
        <div id="profile-avatar" class="profile-avatar" aria-hidden="true">⌂</div>
        <div class="profile-summary-copy"><p class="eyebrow">Local household</p><h2 id="profile-name">Household profiles</h2><p>No online account · No app owner</p><div class="profile-badges"><span>${householdSize} ${householdSize === 1 ? "person" : "people"}</span><span><svg aria-hidden="true" viewBox="0 0 24 24"><rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg> Encrypted locally</span></div></div>
      </section>

      <div class="more-grid">
        <section class="more-card settings-group" aria-labelledby="privacy-settings-title">
          <div class="more-card-heading settings-group-heading">
            <span class="more-card-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg></span>
            <div><p class="eyebrow">Privacy and security</p><h2 id="privacy-settings-title">Protect this device</h2></div>
          </div>
          <div class="settings-list">
            <div class="settings-row"><span class="settings-row-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M4 7h16v12H4Z"/><path d="M8 7V5h8v2M8 12h8"/></svg></span><div><h3 id="local-data-title">Stored only on this device</h3><p>Encrypted while UrbanFox is locked; there is no online app database.</p></div><span class="settings-state">Local</span></div>
            <div class="settings-row"><span class="settings-row-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg></span><div><h3>App lock</h3><p>Require the four-digit PIN before records can be viewed again.</p></div><button id="lock-from-more" class="settings-row-action" type="button">Lock now</button></div>
          </div>
        </section>

        <section class="more-card backup-card" aria-labelledby="backup-title">
          <div class="more-card-heading">
            <span class="more-card-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 3v11m0 0 4-4m-4 4-4-4M5 17v3h14v-3"/></svg></span>
            <div><p class="eyebrow">Data safety</p><h2 id="backup-title">Backup and restore</h2></div>
          </div>
          <p>Download household tracker records and encrypted document files as one password-protected file. The backup password is separate from your four-digit PIN.</p>
          <div class="more-action-group"><button id="create-backup" class="primary-button more-action" type="button">Create encrypted backup</button><button id="restore-backup" class="secondary-button more-action" type="button">Restore encrypted backup</button></div>
          <p id="backup-status" class="more-card-status" role="status"></p>
          <p class="field-guidance">Keep each backup file and its password somewhere safe and separate.</p>
        </section>

        <section class="more-card settings-group app-settings-card" aria-labelledby="app-settings-title">
          <div class="more-card-heading settings-group-heading">
            <span class="more-card-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 3v11m0 0 4-4m-4 4-4-4M5 17v3h14v-3"/></svg></span>
            <div><p class="eyebrow">App and information</p><h2 id="app-settings-title">UrbanFox settings</h2></div>
          </div>
          <div class="settings-list">
            <div class="settings-row"><span class="settings-row-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 3a9 9 0 1 0 9 9 7 7 0 0 1-9-9Z"/></svg></span><div><h3>Theme</h3><p>Choose how UrbanFox looks on this device.</p></div><label class="settings-select-label" for="theme-preference"><span class="visually-hidden">Theme preference</span><select id="theme-preference" class="settings-select"><option value="light">Light</option><option value="dark">Dark</option><option value="system">System</option></select></label></div>
            <div class="settings-row"><span class="settings-row-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 3v11m0 0 4-4m-4 4-4-4M5 17v3h14v-3"/></svg></span><div><h3>Install and updates</h3><p>Version ${APP_VERSION} · Check for a newer cached app.</p></div><button id="open-install-settings" class="settings-row-action" type="button">Open</button></div>
            <div class="settings-row"><span class="settings-row-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/></svg></span><div><h3 id="legal-title">Terms, privacy, and licence</h3><p>Review the tracking disclaimer, privacy notice and proprietary licence.</p></div><button id="view-legal" class="settings-row-action" type="button" aria-label="View legal information">View</button></div>
          </div>
        </section>

        <section class="more-card danger-zone" aria-labelledby="delete-data-title">
          <div class="more-card-heading">
            <span class="more-card-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5"/></svg></span>
            <div><p class="eyebrow">Danger Zone</p><h2 id="delete-data-title">Delete all local data</h2></div>
          </div>
          <p>Permanently remove this household, every family member, permission and trip, the local PIN, and Terms acceptance from this browser.</p>
          <p class="local-data-banner danger-warning"><strong>This cannot be undone.</strong> Create and safely store an encrypted backup first if you may need these records again.</p>
          <button id="open-delete-data" class="secondary-button more-action danger-button" type="button">Delete all local data</button>
        </section>
      </div>

      <p class="more-version">UrbanFox ILR ${APP_VERSION} · Local-first household tracker</p>
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
          <dl class="restore-counts"><div><dt>People</dt><dd id="restore-people"></dd></div><div><dt>Permissions</dt><dd id="restore-permissions"></dd></div><div><dt>Trips</dt><dd id="restore-trips"></dd></div><div><dt>Documents</dt><dd id="restore-documents"></dd></div></dl>
          <p id="restore-exported"></p>
          <p id="restore-replacement-guidance" class="local-data-banner"><strong>This replaces current local records.</strong> Create a fresh backup first if you may need the data currently on this device.</p>
          <label class="checkbox-field" for="restore-confirmation"><input id="restore-confirmation" type="checkbox" /><span><strong>I understand this replaces my current local records</strong></span></label>
          <button id="replace-local-data" class="primary-button" type="button" disabled>Replace local data</button>
        </section>
      </form>
    </dialog>
    ${renderDeleteDataDialog("unlocked")}`,
  );
  const themePreference =
    root.querySelector<HTMLSelectElement>("#theme-preference");
  if (themePreference) themePreference.value = getThemePreference();
}
