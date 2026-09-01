import type {
  HouseholdMember,
  HouseholdMemberInput,
  ImmigrationRole,
} from "../domain/household-member";

export function renderHouseholdMemberDialogMarkup(): string {
  return `<dialog id="family-dialog" class="family-dialog member-profile-dialog" aria-labelledby="family-form-title">
    <form id="family-form" class="family-form member-profile-form" novalidate>
      <button class="dialog-close member-profile-close" type="button" aria-label="Close family form">×</button>
      <div class="member-profile-header">
        <div class="member-profile-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3"/><path d="M3.5 19c0-3.2 2.2-5.2 5.5-5.2s5.5 2 5.5 5.2"/><path d="M17 7v6M14 10h6"/></svg>
        </div>
        <p class="eyebrow">Encrypted local profile</p>
        <h2 id="family-form-title">Add household member</h2>
        <p id="family-form-subtitle">Add this person’s details to keep their ILR tracking separate and accurate.</p>
      </div>
      <input id="family-member-id" name="memberId" type="hidden" />
      <div class="member-profile-fields">
        <div class="member-profile-field">
          <label for="family-full-name">Full name</label>
          <div class="member-profile-control">
            <span class="member-profile-control-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24"><rect x="4" y="6" width="16" height="12" rx="2"/><circle cx="9" cy="11" r="2"/><path d="M13 10h4M13 14h4"/></svg>
            </span>
            <input id="family-full-name" name="fullName" autocomplete="name" maxlength="100" placeholder="e.g. Jane Doe" required />
          </div>
        </div>
        <div class="member-profile-field">
          <label for="family-date-of-birth">Date of birth</label>
          <div class="member-profile-control">
            <span class="member-profile-control-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24"><rect x="4" y="6" width="16" height="14" rx="2"/><path d="M8 3v5M16 3v5M4 10h16"/></svg>
            </span>
            <input id="family-date-of-birth" name="dateOfBirth" type="date" autocomplete="bday" required />
          </div>
        </div>
        <div class="member-profile-field">
          <label for="family-immigration-role">Immigration role</label>
          <div class="member-profile-control member-profile-select-control">
            <span class="member-profile-control-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24"><path d="M6 3h9l3 3v15H6Z"/><path d="M15 3v4h4M9 11h6M9 15h6"/></svg>
            </span>
            <select id="family-immigration-role" name="immigrationRole" required><option value="not-set">Not set yet</option><option value="main-applicant">Main applicant</option><option value="dependant">Dependant</option></select>
          </div>
          <p class="field-guidance">This is the person’s immigration role only. It does not make them an app owner.</p>
        </div>
      </div>
      <p id="family-form-error" class="form-error" role="alert" hidden></p>
      <div class="member-profile-actions">
        <button id="delete-household-member" class="secondary-button danger-button" type="button" hidden>Delete member</button>
        <button class="primary-button family-save-button member-profile-save" type="submit"><span>Save household member</span><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg></button>
      </div>
    </form>
  </dialog>`;
}

export function showHouseholdMemberForm(
  root: HTMLElement,
  member?: HouseholdMember,
  canDelete = false,
): void {
  const dialog = root.querySelector<HTMLDialogElement>("#family-dialog");
  const form = root.querySelector<HTMLFormElement>("#family-form");
  if (!dialog || !form) throw new Error("Family form is unavailable.");
  form.reset();
  const title = form.querySelector<HTMLElement>("#family-form-title");
  const subtitle = form.querySelector<HTMLElement>("#family-form-subtitle");
  const error = form.querySelector<HTMLElement>("#family-form-error");
  const deleteButton = form.querySelector<HTMLButtonElement>(
    "#delete-household-member",
  );
  if (title)
    title.textContent = member
      ? "Edit household member"
      : "Add household member";
  if (subtitle)
    subtitle.textContent = member
      ? "Update this person’s profile details without changing their stored immigration history."
      : "Add this person’s details to keep their ILR tracking separate and accurate.";
  if (error) {
    error.textContent = "";
    error.hidden = true;
  }
  if (deleteButton) {
    deleteButton.hidden = !member || !canDelete;
    deleteButton.dataset.memberId = member?.id ?? "";
    deleteButton.textContent = member
      ? `Delete ${member.fullName}`
      : "Delete member";
  }
  if (member) {
    const memberId = form.elements.namedItem("memberId") as HTMLInputElement;
    const name = form.elements.namedItem("fullName") as HTMLInputElement;
    const dateOfBirth = form.elements.namedItem(
      "dateOfBirth",
    ) as HTMLInputElement;
    const immigrationRole = form.elements.namedItem(
      "immigrationRole",
    ) as HTMLSelectElement;
    memberId.value = member.id;
    name.value = member.fullName;
    dateOfBirth.value = member.dateOfBirth;
    immigrationRole.value = member.immigrationRole;
  }
  dialog.showModal();
}

export function readHouseholdMemberInput(form: HTMLFormElement): {
  memberId: string;
  input: HouseholdMemberInput;
} {
  const data = new FormData(form);
  return {
    memberId: String(data.get("memberId") ?? ""),
    input: {
      fullName: String(data.get("fullName") ?? "").trim(),
      dateOfBirth: String(data.get("dateOfBirth") ?? ""),
      immigrationRole: String(
        data.get("immigrationRole") ?? "",
      ) as ImmigrationRole,
    },
  };
}
