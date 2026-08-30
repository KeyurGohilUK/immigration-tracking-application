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

export function renderImmigrationHistoryPage(
  root: HTMLElement,
  owner: OwnerProfile,
  members: FamilyMember[],
  selectedProfileId: string,
  permissions: ImmigrationPermission[],
): void {
  renderAppShell(
    root,
    "Home",
    `<main id="main-content" class="record-main">
      <section class="record-heading" aria-labelledby="permission-title"><div><p class="eyebrow">Selected profile</p><h1 id="permission-title">Immigration history</h1><p>Record each permission separately. UrbanFox does not yet calculate eligibility from these details.</p></div><div class="record-heading-actions"><button id="back-to-dashboard" class="secondary-button" type="button">Back to Home</button><button id="add-permission" class="primary-button compact-button" type="button">Add permission</button></div></section>
      ${renderPersonSwitcherMarkup()}
      <aside class="notice compact-notice" aria-labelledby="permission-warning-title"><span class="notice-icon" aria-hidden="true">i</span><div><h2 id="permission-warning-title">Tracking only—not an eligibility result</h2><p>Permission dates and UK arrival dates are stored separately. Verify every record against official documents.</p></div></aside>
      <section aria-labelledby="permission-list-title"><div class="section-heading"><h2 id="permission-list-title">Recorded permissions</h2><span id="permission-count" class="step-count"></span></div><div id="permission-list" class="record-list"></div></section>
      <p id="permission-page-error" class="form-error" role="alert" hidden></p>
    </main>
    <dialog id="permission-dialog" class="family-dialog" aria-labelledby="permission-form-title"><form id="permission-form" class="family-form" novalidate><div class="app-manager-heading"><div><p class="eyebrow">Encrypted local record</p><h2 id="permission-form-title">Add immigration permission</h2></div><button class="dialog-close" type="button" aria-label="Close permission form">×</button></div><input name="permissionId" type="hidden" /><label for="permission-route">Immigration route</label><select id="permission-route" name="route" required><option value="">Choose route</option><option value="skilled-worker">Skilled Worker</option><option value="health-and-care-worker">Health and Care Worker</option><option value="other">Other or not listed</option></select><div id="other-route-field" hidden><label for="other-route-name">Permission route name</label><input id="other-route-name" name="otherRouteName" maxlength="100" /></div><label for="permission-role">Permission held as</label><select id="permission-role" name="role" required><option value="">Choose role</option><option value="main-applicant">Main applicant</option><option value="dependant">Dependant</option></select><label for="grant-date">Visa grant date <span class="optional-label">Needed for absence calculations</span></label><input id="grant-date" name="grantDate" type="date" /><p class="field-guidance">Use the decision or grant notice date. This is stored separately from the permission start date.</p><label for="permission-start">Permission start date</label><input id="permission-start" name="permissionStartDate" type="date" required /><label for="permission-expiry">Permission expiry date</label><input id="permission-expiry" name="permissionExpiryDate" type="date" required /><label for="actual-uk-arrival">Actual UK arrival date <span class="optional-label">Optional</span></label><input id="actual-uk-arrival" name="actualUkArrivalDate" type="date" /><p class="field-guidance">Leave arrival blank for an in-country permission or when this permission did not involve entering the UK.</p><p id="permission-form-error" class="form-error" role="alert" hidden></p><button class="primary-button" type="submit">Save permission</button></form></dialog>`,
  );

  populatePersonSwitcher(root, owner, members, selectedProfileId);
  const list = root.querySelector<HTMLElement>("#permission-list");
  const count = root.querySelector<HTMLElement>("#permission-count");
  if (!list || !count)
    throw new Error("Immigration history could not be rendered.");
  count.textContent = `${permissions.length} ${permissions.length === 1 ? "record" : "records"}`;
  if (permissions.length === 0) {
    const empty = document.createElement("div");
    empty.className = "family-empty-state";
    empty.innerHTML =
      "<h3>No permissions recorded</h3><p>Add the selected person’s immigration permission dates from their official documents.</p>";
    list.append(empty);
    return;
  }
  for (const permission of [...permissions].sort((left, right) =>
    right.permissionStartDate.localeCompare(left.permissionStartDate),
  )) {
    list.append(createPermissionCard(permission));
  }
}

function createPermissionCard(permission: ImmigrationPermission): HTMLElement {
  const card = document.createElement("article");
  card.className = "record-card";
  card.innerHTML = `<div class="record-card-heading"><div><p class="eyebrow">Immigration permission</p><h3></h3><span class="member-role permission-role"></span></div><div class="member-actions"><button class="member-action" type="button">Edit</button><button class="member-action destructive-action" type="button">Delete</button></div></div><dl class="record-dates permission-dates"><div><dt>Grant</dt><dd></dd></div><div><dt>Start</dt><dd></dd></div><div><dt>Expiry</dt><dd></dd></div><div><dt>Actual UK arrival</dt><dd></dd></div></dl><p class="calculation-support"></p>`;
  const route = card.querySelector<HTMLElement>("h3");
  const role = card.querySelector<HTMLElement>(".permission-role");
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
    dateValues[2].textContent = permission.permissionExpiryDate;
  if (dateValues[3])
    dateValues[3].textContent =
      permission.actualUkArrivalDate || "Not recorded";
  if (support)
    support.textContent =
      permission.route !== "other" && !permission.grantDate
        ? "Add the visa grant date before using the recorded absence check."
        : getCalculationSupportMessage(permission.route);
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
