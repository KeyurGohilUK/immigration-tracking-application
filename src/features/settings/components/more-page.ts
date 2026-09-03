import { renderAppShell } from "../../../app/app";
import { renderLiquidGlassDialog } from "../../../shared/components/liquid-glass-dialog";
import { APP_VERSION } from "../../../configuration/release-metadata";
import { renderDeleteDataDialog } from "./delete-data-dialog";
import { getThemePreference } from "../services/theme-preference";

export function renderMorePage(root: HTMLElement, householdSize: number): void {
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
        <details class="more-card settings-group collapsible-settings-section">
          <summary class="more-card-heading settings-group-heading">
            <span class="more-card-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg></span>
            <div><p class="eyebrow">Privacy and security</p><h2>Protect this device</h2></div>
          </summary>
          <div class="settings-section-content">
            <div class="settings-list">
            <div class="settings-row"><span class="settings-row-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M4 7h16v12H4Z"/><path d="M8 7V5h8v2M8 12h8"/></svg></span><div><h3 id="local-data-title">Stored only on this device</h3><p>Encrypted while UrbanFox is locked; there is no online app database.</p></div><span class="settings-state">Local</span></div>
            <div class="settings-row"><span class="settings-row-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg></span><div><h3>App lock</h3><p>Require the four-digit PIN before records can be viewed again.</p></div><button id="lock-from-more" class="settings-row-action" type="button">Lock now</button></div>
            </div>
          </div>
        </details>

        <details class="more-card backup-card collapsible-settings-section">
          <summary class="more-card-heading">
            <span class="more-card-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 3v11m0 0 4-4m-4 4-4-4M5 17v3h14v-3"/></svg></span>
            <div><p class="eyebrow">Data safety</p><h2>Backup and restore</h2></div>
          </summary>
          <div class="settings-section-content">
          <p>Download household tracker records and encrypted document files as one password-protected file. The backup password is separate from your four-digit PIN.</p>
          <div class="more-action-group"><button id="create-backup" class="primary-button more-action" type="button">Create encrypted backup</button><button id="restore-backup" class="secondary-button more-action" type="button">Restore encrypted backup</button></div>
          <p id="backup-status" class="more-card-status" role="status"></p>
          <p class="field-guidance">Keep each backup file and its password somewhere safe and separate.</p>
          </div>
        </details>

        <section class="more-card standalone-settings-card appearance-card" aria-labelledby="appearance-title">
          <div class="standalone-settings-heading">
            <span class="more-card-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 3a9 9 0 1 0 9 9 7 7 0 0 1-9-9Z"/></svg></span>
            <div><p class="eyebrow">Display</p><h2 id="appearance-title">Appearance</h2><p>Choose how UrbanFox looks. System follows your device setting.</p></div>
          </div>
          <fieldset class="appearance-toggle" aria-label="Appearance">
            <legend class="visually-hidden">Appearance</legend>
            <div class="appearance-toggle-track">
              <span class="appearance-toggle-thumb" aria-hidden="true"></span>
              <label class="appearance-toggle-option">
                <input type="radio" name="theme-preference" value="dark" />
                <span><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M12 3a9 9 0 1 0 9 9 7 7 0 0 1-9-9Z"/></svg><strong>Dark</strong></span>
              </label>
              <label class="appearance-toggle-option">
                <input type="radio" name="theme-preference" value="system" />
                <span><svg aria-hidden="true" viewBox="0 0 24 24"><rect x="4" y="5" width="16" height="11" rx="2"/><path d="M8 20h8M12 16v4"/></svg><strong>System</strong></span>
              </label>
              <label class="appearance-toggle-option">
                <input type="radio" name="theme-preference" value="light" />
                <span><svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.66 6.34l1.41-1.41"/></svg><strong>Light</strong></span>
              </label>
            </div>
          </fieldset>
        </section>

        <section class="more-card standalone-settings-card legal-card" aria-labelledby="legal-title">
          <div class="standalone-settings-heading legal-settings-heading">
            <span class="more-card-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7h.01"/></svg></span>
            <div><p class="eyebrow">Information</p><h2 id="legal-title">Terms, privacy, and licence</h2><p>Review the tracking disclaimer, privacy notice and proprietary licence.</p></div>
            <button id="view-legal" class="settings-row-action" type="button" aria-label="View legal information">View</button>
          </div>
        </section>

        <details class="more-card danger-zone collapsible-settings-section">
          <summary class="more-card-heading">
            <span class="more-card-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5"/></svg></span>
            <div><p class="eyebrow">Danger Zone</p><h2>Delete all local data</h2></div>
          </summary>
          <div class="settings-section-content">
          <p>Permanently remove this household, every family member, permission and trip, the local PIN, and Terms acceptance from this browser.</p>
          <p class="local-data-banner danger-warning"><strong>This cannot be undone.</strong> Create and safely store an encrypted backup first if you may need these records again.</p>
          <button id="open-delete-data" class="secondary-button more-action danger-button" type="button">Delete all local data</button>
          </div>
        </details>
      </div>

      <p class="more-version">UrbanFox ILR ${APP_VERSION} · Local-first household tracker</p>
    </main>
    ${renderLiquidGlassDialog({
      id: "backup-dialog",
      labelledBy: "backup-dialog-title",
      formId: "backup-form",
      eyebrow: "Encrypted download",
      title: "Create a backup",
      subtitle:
        "Use a unique password with at least 12 characters. UrbanFox cannot recover this password or open the backup without it.",
      iconSvg:
        '<svg viewBox="0 0 24 24"><path d="M12 3v12M7 10l5 5 5-5"/><path d="M5 19h14"/></svg>',
      body: `<p id="backup-guidance" class="sr-only">Use a unique password with at least 12 characters.</p>
        <label for="backup-password">Backup password</label>
        <input id="backup-password" name="password" type="password" minlength="12" autocomplete="new-password" aria-describedby="backup-guidance" required />
        <label for="backup-password-confirmation">Confirm backup password</label>
        <input id="backup-password-confirmation" name="confirmation" type="password" minlength="12" autocomplete="new-password" required />
        <p id="backup-form-error" class="form-error" role="alert" hidden></p>`,
      actions:
        '<button class="primary-button liquid-dialog-save" type="submit">Download encrypted backup</button>',
      closeLabel: "Close backup form",
    })}
    ${renderLiquidGlassDialog({
      id: "restore-dialog",
      labelledBy: "restore-dialog-title",
      formId: "restore-form",
      eyebrow: "Replace-only restore",
      title: "Restore a backup",
      subtitle:
        "Choose an UrbanFox encrypted JSON backup and enter its separate backup password. Nothing changes until you review and confirm.",
      iconSvg:
        '<svg viewBox="0 0 24 24"><path d="M12 21V9M7 14l5-5 5 5"/><path d="M5 5h14"/></svg>',
      body: `<p id="restore-guidance" class="sr-only">Choose an encrypted backup and enter its password.</p>
        <label for="restore-file">Encrypted backup file</label>
        <input id="restore-file" name="backupFile" type="file" accept="application/json,.json" aria-describedby="restore-guidance" required />
        <label for="restore-password">Restore backup password</label>
        <input id="restore-password" name="password" type="password" minlength="12" autocomplete="current-password" required />
        <p id="restore-form-error" class="form-error" role="alert" hidden></p>
        <section id="restore-summary" class="restore-summary" aria-labelledby="restore-summary-title" hidden>
          <p class="eyebrow">Validated backup</p>
          <h3 id="restore-summary-title">Review before replacing data</h3>
          <dl class="restore-counts"><div><dt>People</dt><dd id="restore-people"></dd></div><div><dt>Permissions</dt><dd id="restore-permissions"></dd></div><div><dt>Trips</dt><dd id="restore-trips"></dd></div><div><dt>Documents</dt><dd id="restore-documents"></dd></div></dl>
          <p id="restore-exported"></p>
          <p id="restore-replacement-guidance" class="local-data-banner"><strong>This replaces current local records.</strong> Create a fresh backup first if you may need the data currently on this device.</p>
          <label class="checkbox-field" for="restore-confirmation"><input id="restore-confirmation" type="checkbox" /><span><strong>I understand this replaces my current local records</strong></span></label>
          <button id="replace-local-data" class="primary-button" type="button" disabled>Replace local data</button>
        </section>`,
      actions:
        '<button id="review-backup" class="primary-button liquid-dialog-save" type="submit">Review backup</button>',
      closeLabel: "Close restore form",
    })}
    ${renderDeleteDataDialog("unlocked")}`,
  );
  const themePreference = getThemePreference();
  root
    .querySelectorAll<HTMLInputElement>('input[name="theme-preference"]')
    .forEach((option) => {
      option.checked = option.value === themePreference;
    });
}
