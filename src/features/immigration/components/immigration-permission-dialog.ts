import { renderLiquidGlassDialog } from "../../../shared/components/liquid-glass-dialog";
import {
  type ImmigrationPermission,
  type ImmigrationPermissionInput,
  type ImmigrationRoute,
  type PermissionRole,
} from "../domain/immigration-permission";

export function renderImmigrationPermissionDialogMarkup(): string {
  return renderLiquidGlassDialog({
    id: "permission-dialog",
    labelledBy: "permission-form-title",
    formId: "permission-form",
    eyebrow: "Encrypted local record",
    title: "Add immigration permission",
    subtitle: "Copy dates exactly from official documents.",
    iconSvg:
      '<svg viewBox="0 0 24 24"><path d="M6 3h9l3 3v15H6Z"/><path d="M15 3v4h4M9 11h6M9 15h6"/></svg>',
    body: `<input name="permissionId" type="hidden" /><div class="family-form-fields permission-form-fields"><div class="family-field family-field-wide"><label for="permission-route">Immigration route</label><select id="permission-route" name="route" required><option value="">Choose route</option><optgroup label="Current Skilled Worker route"><option value="skilled-worker">Skilled Worker</option><option value="health-and-care-worker">Health and Care Worker</option><option value="tier-2-general">Tier 2 (General)</option></optgroup><optgroup label="Other routes that may count"><option value="global-talent">Global Talent</option><option value="innovator-founder">Innovator Founder</option><option value="t2-minister-of-religion">T2 Minister of Religion</option><option value="international-sportsperson">International Sportsperson</option><option value="representative-overseas-business">Representative of an Overseas Business</option><option value="tier-1">Tier 1 (not Graduate Entrepreneur)</option><option value="scale-up">Scale-up</option></optgroup><option value="other">Other or not listed</option></select></div><div id="other-route-field" class="family-field family-field-wide" hidden><label for="other-route-name">Permission route name</label><input id="other-route-name" name="otherRouteName" maxlength="100" /></div><div class="family-field family-field-wide"><label for="permission-role">Permission held as</label><select id="permission-role" name="role" required><option value="">Choose role</option><option value="main-applicant">Main applicant</option><option value="dependant">Dependant</option></select></div><div class="family-field"><label for="grant-date">Visa grant date <span class="optional-label">Needed for calculations</span></label><input id="grant-date" name="grantDate" type="date" /><p class="field-guidance">Use the date entry clearance or permission was granted.</p></div><div class="family-field"><label for="permission-start">Permission start date</label><input id="permission-start" name="permissionStartDate" type="date" required /></div><div class="family-field"><label for="permission-expiry">Permission expiry date</label><input id="permission-expiry" name="permissionExpiryDate" type="date" required /></div><div class="family-field"><label for="actual-uk-arrival">Actual UK arrival date <span class="optional-label">Optional</span></label><input id="actual-uk-arrival" name="actualUkArrivalDate" type="date" /><p class="field-guidance">Leave blank for an in-country permission or when no UK entry was involved.</p></div></div><p class="permission-form-guidance">Pre-entry days after an entry-clearance grant count as absence days under Home Office guidance.</p><p id="permission-form-error" class="form-error" role="alert" hidden></p>`,
    actions:
      '<button id="delete-permission" class="secondary-button destructive-action" type="button" hidden>Delete permission</button><button class="primary-button family-save-button liquid-dialog-save" type="submit">Save permission</button>',
    dialogClass: "permission-dialog",
    closeLabel: "Close permission form",
  });
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
  const deleteButton =
    form.querySelector<HTMLButtonElement>("#delete-permission");
  if (title)
    title.textContent = permission
      ? "Edit immigration permission"
      : "Add immigration permission";
  if (error) {
    error.textContent = "";
    error.hidden = true;
  }
  if (deleteButton) {
    deleteButton.hidden = !permission;
    deleteButton.dataset.permissionId = permission?.id ?? "";
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
