import { renderAppShell } from "../../../app/app";
import {
  populatePersonSwitcher,
  renderPersonSwitcherMarkup,
} from "../../household/components/person-switcher";
import type { FamilyMember } from "../../household/domain/family-member";
import type { OwnerProfile } from "../../household/domain/owner-profile";
import {
  getCalculationSupportMessage,
  getPermissionRouteLabel,
  type ImmigrationPermission,
  type ImmigrationPermissionInput,
  type ImmigrationRoute,
  type PermissionRole,
} from "../domain/immigration-permission";
import { isSkilledWorkerDependantRoute } from "../../calculation/domain/dependant-qualifying-period-rule";

export function renderImmigrationHistoryPage(
  root: HTMLElement,
  owner: OwnerProfile,
  members: FamilyMember[],
  selectedProfileId: string,
  permissions: ImmigrationPermission[],
): void {
  const latestRecordedExpiry = permissions.reduce(
    (latest, permission) =>
      permission.permissionExpiryDate > latest
        ? permission.permissionExpiryDate
        : latest,
    "",
  );
  const mainApplicantRecords = permissions.filter(
    ({ role }) => role === "main-applicant",
  ).length;
  renderAppShell(
    root,
    "Home",
    `<main id="main-content" class="record-main immigration-main">
      <section class="record-heading immigration-heading" aria-labelledby="permission-title"><div><p class="eyebrow">Selected profile</p><h1 id="permission-title">Immigration history</h1><p>Build a separate chronological record from official immigration documents.</p></div><div class="record-heading-actions"><button id="back-to-dashboard" class="secondary-button" type="button">Back to Dashboard</button><button id="add-permission" class="primary-button compact-button" type="button"><span aria-hidden="true">＋</span> Add permission</button></div></section>
      <section class="immigration-profile-picker" aria-label="Choose a profile for immigration history">${renderPersonSwitcherMarkup()}</section>
      <section class="permission-summary-grid" aria-label="Recorded immigration summary">
        <article class="permission-summary-card"><p class="eyebrow">Recorded permissions</p><p class="permission-summary-value"><span id="permission-count">${permissions.length}</span><small>${permissions.length === 1 ? "record" : "records"}</small></p><p>${mainApplicantRecords} ${mainApplicantRecords === 1 ? "main-applicant record" : "main-applicant records"}</p></article>
        <article class="permission-summary-card"><p class="eyebrow">Latest recorded expiry</p><p class="permission-summary-date">${latestRecordedExpiry || "Not recorded"}</p><p>This is a stored document date, not a current-status decision.</p></article>
      </section>
      <aside class="notice compact-notice immigration-notice" aria-labelledby="permission-warning-title"><span class="notice-icon" aria-hidden="true">i</span><div><h2 id="permission-warning-title">Tracking only—not an eligibility result</h2><p>Verify grant, start, arrival, and expiry dates against official documents. UrbanFox does not confirm immigration status.</p></div></aside>
      <section class="permission-timeline-panel" aria-labelledby="permission-list-title"><div class="section-heading"><div><p class="eyebrow">Chronological record</p><h2 id="permission-list-title">Permission timeline</h2></div></div><div id="permission-list" class="record-list permission-timeline"></div></section>
      <p id="permission-page-error" class="form-error" role="alert" hidden></p>
    </main>
    <dialog id="permission-dialog" class="family-dialog permission-dialog" aria-labelledby="permission-form-title"><form id="permission-form" class="family-form" novalidate><div class="app-manager-heading family-form-heading"><div><p class="eyebrow">Encrypted local record</p><h2 id="permission-form-title">Add immigration permission</h2><p>Copy dates exactly from official documents.</p></div><button class="dialog-close" type="button" aria-label="Close permission form">×</button></div><input name="permissionId" type="hidden" /><div class="family-form-fields permission-form-fields"><div class="family-field family-field-wide"><label for="permission-route">Immigration route</label><select id="permission-route" name="route" required><option value="">Choose route</option><optgroup label="Current Skilled Worker route"><option value="skilled-worker">Skilled Worker</option><option value="health-and-care-worker">Health and Care Worker</option><option value="tier-2-general">Tier 2 (General)</option></optgroup><optgroup label="Other routes that may count"><option value="global-talent">Global Talent</option><option value="innovator-founder">Innovator Founder</option><option value="t2-minister-of-religion">T2 Minister of Religion</option><option value="international-sportsperson">International Sportsperson</option><option value="representative-overseas-business">Representative of an Overseas Business</option><option value="tier-1">Tier 1 (not Graduate Entrepreneur)</option><option value="scale-up">Scale-up</option></optgroup><option value="other">Other or not listed</option></select></div><div id="other-route-field" class="family-field family-field-wide" hidden><label for="other-route-name">Permission route name</label><input id="other-route-name" name="otherRouteName" maxlength="100" /></div><div class="family-field family-field-wide"><label for="permission-role">Permission held as</label><select id="permission-role" name="role" required><option value="">Choose role</option><option value="main-applicant">Main applicant</option><option value="dependant">Dependant</option></select></div><div class="family-field"><label for="grant-date">Visa grant date <span class="optional-label">Needed for calculations</span></label><input id="grant-date" name="grantDate" type="date" /><p class="field-guidance">Use the date entry clearance or permission was granted.</p></div><div class="family-field"><label for="permission-start">Permission start date</label><input id="permission-start" name="permissionStartDate" type="date" required /></div><div class="family-field"><label for="permission-expiry">Permission expiry date</label><input id="permission-expiry" name="permissionExpiryDate" type="date" required /></div><div class="family-field"><label for="actual-uk-arrival">Actual UK arrival date <span class="optional-label">Optional</span></label><input id="actual-uk-arrival" name="actualUkArrivalDate" type="date" /><p class="field-guidance">Leave blank for an in-country permission or when no UK entry was involved.</p></div></div><p class="permission-form-guidance">Pre-entry days after an entry-clearance grant count as absence days under Home Office guidance.</p><p id="permission-form-error" class="form-error" role="alert" hidden></p><button class="primary-button family-save-button" type="submit">Save permission</button></form></dialog>`,
  );

  populatePersonSwitcher(root, owner, members, selectedProfileId);
  const list = root.querySelector<HTMLElement>("#permission-list");
  if (!list) throw new Error("Immigration history could not be rendered.");
  if (permissions.length === 0) {
    const empty = document.createElement("div");
    empty.className = "family-empty-state";
    empty.innerHTML =
      "<h3>No permissions recorded</h3><p>Add the selected person’s immigration permission dates from their official documents.</p>";
    list.append(empty);
    return;
  }
  for (const permission of [...permissions].sort((left, right) =>
    left.permissionStartDate.localeCompare(right.permissionStartDate),
  )) {
    list.append(createPermissionCard(permission));
  }
}

function createPermissionCard(permission: ImmigrationPermission): HTMLElement {
  const card = document.createElement("article");
  card.className = "record-card permission-entry";
  card.innerHTML = `<span class="permission-marker" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M7 3h8l4 4v14H7Z"/><path d="M15 3v5h4M10 12h6M10 16h6"/></svg></span><div class="permission-card-content"><div class="record-card-heading"><div><p class="eyebrow">Immigration permission</p><h3></h3><div class="permission-badges"><span class="member-role permission-role"></span><span class="permission-state"></span></div></div></div><dl class="record-dates permission-dates"><div><dt>Grant</dt><dd></dd></div><div><dt>Permission start</dt><dd></dd></div><div><dt>UK arrival</dt><dd></dd></div><div><dt>Permission expiry</dt><dd></dd></div></dl><p class="calculation-support permission-support"></p><div class="member-actions"><button class="member-action" type="button"><svg aria-hidden="true" viewBox="0 0 24 24"><path d="m4 20 4.5-1 10-10a2.1 2.1 0 0 0-3-3l-10 10Z"/><path d="m14 7 3 3"/></svg><span>Edit</span></button><button class="member-action destructive-action" type="button"><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5"/></svg><span>Delete</span></button></div></div>`;
  const route = card.querySelector<HTMLElement>("h3");
  const role = card.querySelector<HTMLElement>(".permission-role");
  const state = card.querySelector<HTMLElement>(".permission-state");
  const dateValues = card.querySelectorAll<HTMLElement>(".record-dates dd");
  const support = card.querySelector<HTMLElement>(".calculation-support");
  const actions = card.querySelectorAll<HTMLButtonElement>(".member-action");
  if (route) route.textContent = getPermissionRouteLabel(permission);
  if (role)
    role.textContent =
      permission.role === "main-applicant" ? "Main applicant" : "Dependant";
  if (dateValues[0])
    dateValues[0].textContent = permission.grantDate || "Missing";
  if (dateValues[1]) dateValues[1].textContent = permission.permissionStartDate;
  if (dateValues[2])
    dateValues[2].textContent =
      permission.actualUkArrivalDate || "Not recorded";
  if (dateValues[3])
    dateValues[3].textContent = permission.permissionExpiryDate;
  const isMissingGrant = permission.route !== "other" && !permission.grantDate;
  const requiresManualReview = permission.route === "other";
  const isDependant = permission.role === "dependant";
  const isSupportedDependant =
    isDependant && isSkilledWorkerDependantRoute(permission.route);
  if (state) {
    state.textContent =
      isSupportedDependant && !isMissingGrant
        ? "Dependant calculation supported"
        : isSupportedDependant
          ? "Review required"
          : isDependant
            ? "Dependant review required"
            : isMissingGrant || requiresManualReview
              ? "Review required"
              : "Calculation supported";
    if (isMissingGrant || requiresManualReview)
      state.classList.add("requires-review");
  }
  if (support) {
    support.textContent =
      isSupportedDependant && isMissingGrant
        ? "Add the visa grant date before using the dependant timing and recorded-absence checks."
        : isSupportedDependant
          ? "This dependant period is calculated separately on the Dashboard and requires confirmation of the linked partner history."
          : isDependant
            ? "This dependant route is not supported for an automated estimate."
            : isMissingGrant
              ? "Add the visa grant date before using the recorded absence check."
              : getCalculationSupportMessage(permission.route);
    if (
      isMissingGrant ||
      requiresManualReview ||
      (isDependant && !isSupportedDependant)
    )
      support.classList.add("requires-review");
  }
  const edit = actions[0];
  const remove = actions[1];
  if (edit) {
    edit.dataset.editPermission = permission.id;
    edit.setAttribute(
      "aria-label",
      `Edit ${getPermissionRouteLabel(permission)}`,
    );
  }
  if (remove) {
    remove.dataset.deletePermission = permission.id;
    remove.setAttribute(
      "aria-label",
      `Delete ${getPermissionRouteLabel(permission)}`,
    );
  }
  return card;
}

export function updateOtherRouteField(form: HTMLFormElement): void {
  const route = form.elements.namedItem("route") as HTMLSelectElement;
  const field = form.querySelector<HTMLElement>("#other-route-field");
  const input = form.elements.namedItem("otherRouteName") as HTMLInputElement;
  if (!field) return;
  field.hidden = route.value !== "other";
  input.required = route.value === "other";
}

export function showImmigrationPermissionForm(
  root: HTMLElement,
  permission?: ImmigrationPermission,
): void {
  const dialog = root.querySelector<HTMLDialogElement>("#permission-dialog");
  const form = root.querySelector<HTMLFormElement>("#permission-form");
  if (!dialog || !form) throw new Error("Permission form is unavailable.");
  form.reset();
  const title = form.querySelector<HTMLElement>("#permission-form-title");
  const error = form.querySelector<HTMLElement>("#permission-form-error");
  if (title)
    title.textContent = permission
      ? "Edit immigration permission"
      : "Add immigration permission";
  if (error) {
    error.textContent = "";
    error.hidden = true;
  }
  if (permission) {
    (form.elements.namedItem("permissionId") as HTMLInputElement).value =
      permission.id;
    (form.elements.namedItem("route") as HTMLSelectElement).value =
      permission.route;
    (form.elements.namedItem("otherRouteName") as HTMLInputElement).value =
      permission.otherRouteName;
    (form.elements.namedItem("role") as HTMLSelectElement).value =
      permission.role;
    (form.elements.namedItem("grantDate") as HTMLInputElement).value =
      permission.grantDate;
    (form.elements.namedItem("permissionStartDate") as HTMLInputElement).value =
      permission.permissionStartDate;
    (
      form.elements.namedItem("permissionExpiryDate") as HTMLInputElement
    ).value = permission.permissionExpiryDate;
    (form.elements.namedItem("actualUkArrivalDate") as HTMLInputElement).value =
      permission.actualUkArrivalDate;
  }
  updateOtherRouteField(form);
  dialog.showModal();
}

export function readImmigrationPermissionInput(form: HTMLFormElement): {
  permissionId: string;
  input: ImmigrationPermissionInput;
} {
  const data = new FormData(form);
  const route = String(data.get("route") ?? "") as ImmigrationRoute;
  return {
    permissionId: String(data.get("permissionId") ?? ""),
    input: {
      route,
      otherRouteName:
        route === "other"
          ? String(data.get("otherRouteName") ?? "").trim()
          : "",
      role: String(data.get("role") ?? "") as PermissionRole,
      grantDate: String(data.get("grantDate") ?? ""),
      permissionStartDate: String(data.get("permissionStartDate") ?? ""),
      permissionExpiryDate: String(data.get("permissionExpiryDate") ?? ""),
      actualUkArrivalDate: String(data.get("actualUkArrivalDate") ?? ""),
    },
  };
}
