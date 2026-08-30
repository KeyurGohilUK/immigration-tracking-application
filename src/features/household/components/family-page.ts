import { renderAppShell } from "../../../app/app";
import type { OwnerProfile } from "../domain/owner-profile";
import {
  populatePersonSwitcher,
  renderPersonSwitcherMarkup,
} from "./person-switcher";
import type {
  FamilyMember,
  FamilyMemberInput,
  FamilyRelationship,
  ImmigrationRole,
} from "../domain/family-member";

const relationshipLabels: Record<FamilyRelationship, string> = {
  "spouse-or-partner": "Spouse or partner",
  child: "Child",
  parent: "Parent",
  other: "Other",
};

const immigrationRoleLabels: Record<ImmigrationRole, string> = {
  "main-applicant": "Main applicant",
  dependant: "Dependant",
  "not-set": "Not set yet",
};

export function renderFamilyPage(
  root: HTMLElement,
  owner: OwnerProfile,
  members: FamilyMember[],
  selectedProfileId: string,
): void {
  renderAppShell(
    root,
    "Family",
    `<main id="main-content" class="family-main">
      <section class="family-heading" aria-labelledby="family-title">
        <div><p class="eyebrow">Private household</p><h1 id="family-title">Your family</h1><p>Keep each person’s immigration and travel records separate in one private household.</p></div>
        <button id="add-family-member" class="primary-button compact-button family-add-button" type="button"><span aria-hidden="true">＋</span> Add family member</button>
      </section>
      <section class="family-overview" aria-labelledby="family-overview-title">
        <div class="family-overview-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3"/><circle cx="17" cy="9" r="2.5"/><path d="M3 20c0-4 2.5-6 6-6s6 2 6 6M14 15c3.5-.5 6 1.2 7 4.5"/></svg></div>
        <div><p class="eyebrow">Household profiles</p><h2 id="family-overview-title"><span id="family-count"></span></h2><p>Encrypted with your four-digit PIN and stored only on this device.</p></div>
        <span class="family-private-badge"><svg aria-hidden="true" viewBox="0 0 24 24"><rect x="5" y="10" width="14" height="10" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg> Private</span>
      </section>
      <section class="family-profile-picker" aria-label="Choose a household profile">${renderPersonSwitcherMarkup()}</section>
      <section class="family-household-panel" aria-labelledby="household-members-title">
        <div class="section-heading"><div><p class="eyebrow">Separate local records</p><h2 id="household-members-title">Household members</h2></div></div>
        <div id="family-list" class="family-list"></div>
      </section>
      <aside class="notice family-notice" aria-labelledby="family-notice-title"><span class="notice-icon" aria-hidden="true">i</span><div><h2 id="family-notice-title">Profiles do not confirm eligibility</h2><p>Each person’s route and circumstances must be assessed separately against current official guidance.</p></div></aside>
      <p id="family-page-error" class="form-error" role="alert" hidden></p>
    </main>
    <dialog id="family-dialog" class="family-dialog" aria-labelledby="family-form-title">
      <form id="family-form" class="family-form" novalidate>
        <div class="app-manager-heading family-form-heading"><div><p class="eyebrow">Encrypted local profile</p><h2 id="family-form-title">Add family member</h2><p>Create a separate record for this person.</p></div><button class="dialog-close" type="button" aria-label="Close family form">×</button></div>
        <input id="family-member-id" name="memberId" type="hidden" />
        <div class="family-form-fields">
          <div class="family-field family-field-wide"><label for="family-full-name">Full name</label><input id="family-full-name" name="fullName" autocomplete="name" maxlength="100" required /></div>
          <div class="family-field"><label for="family-date-of-birth">Date of birth</label><input id="family-date-of-birth" name="dateOfBirth" type="date" autocomplete="bday" required /></div>
          <div class="family-field"><label for="family-relationship">Relationship to household owner</label><select id="family-relationship" name="relationship" required><option value="">Choose relationship</option><option value="spouse-or-partner">Spouse or partner</option><option value="child">Child</option><option value="parent">Parent</option><option value="other">Other</option></select></div>
          <div class="family-field family-field-wide"><label for="family-immigration-role">Immigration role</label><select id="family-immigration-role" name="immigrationRole" required><option value="not-set">Not set yet</option><option value="main-applicant">Main applicant</option><option value="dependant">Dependant</option></select><p class="field-guidance">Choose “Not set yet” if you are unsure. UrbanFox will wait for complete route details before showing an estimate.</p></div>
        </div>
        <p id="family-form-error" class="form-error" role="alert" hidden></p>
        <button class="primary-button family-save-button" type="submit">Save family member</button>
      </form>
    </dialog>`,
  );

  const list = root.querySelector<HTMLElement>("#family-list");
  const count = root.querySelector<HTMLElement>("#family-count");
  if (!list || !count) throw new Error("Family page could not be rendered.");
  populatePersonSwitcher(root, owner, members, selectedProfileId);
  count.textContent = `${members.length + 1} ${members.length === 0 ? "person" : "people"}`;

  const ownerCard = createMemberCard(
    owner.fullName,
    "Household owner",
    "You",
    owner.id,
    true,
    selectedProfileId === owner.id,
  );
  ownerCard.classList.add("owner-card");
  list.append(ownerCard);

  if (members.length === 0) {
    const emptyState = document.createElement("div");
    emptyState.className = "family-empty-state";
    emptyState.innerHTML =
      "<h3>No family members added yet</h3><p>Add someone only when you need to keep their immigration and travel history separate.</p>";
    list.append(emptyState);
    return;
  }

  for (const member of members) {
    list.append(
      createMemberCard(
        member.fullName,
        relationshipLabels[member.relationship],
        immigrationRoleLabels[member.immigrationRole],
        member.id,
        false,
        selectedProfileId === member.id,
      ),
    );
  }
}

function createMemberCard(
  name: string,
  relationship: string,
  role: string,
  profileId: string,
  isOwner: boolean,
  isSelected: boolean,
): HTMLElement {
  const card = document.createElement("article");
  card.className = "family-member-card";
  card.innerHTML = `<div class="member-card-main"><div class="member-avatar" aria-hidden="true"></div><div class="member-summary"><h3></h3><p class="member-relationship"></p><div class="member-badges"><span class="member-role"></span></div></div></div>`;
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  const avatar = card.querySelector<HTMLElement>(".member-avatar");
  const heading = card.querySelector<HTMLElement>("h3");
  const relationshipElement = card.querySelector<HTMLElement>(
    ".member-relationship",
  );
  const roleElement = card.querySelector<HTMLElement>(".member-role");
  if (avatar) avatar.textContent = initial;
  if (heading) heading.textContent = name;
  if (relationshipElement) relationshipElement.textContent = relationship;
  if (roleElement) roleElement.textContent = role;
  if (isSelected) {
    card.classList.add("selected-member-card");
    const selectedBadge = document.createElement("span");
    selectedBadge.className = "selected-profile-badge";
    selectedBadge.textContent = "Selected";
    card.querySelector(".member-badges")?.append(selectedBadge);
  }

  if (!isSelected || !isOwner) {
    const actions = document.createElement("div");
    actions.className = "member-actions";
    if (!isSelected) {
      const select = document.createElement("button");
      select.type = "button";
      select.className = "member-action";
      select.dataset.selectProfile = profileId;
      select.setAttribute("aria-label", `Select ${name}`);
      select.textContent = "View profile";
      actions.append(select);
    }
    if (!isOwner) {
      const edit = document.createElement("button");
      edit.type = "button";
      edit.className = "member-action";
      edit.dataset.editMember = profileId;
      edit.setAttribute("aria-label", `Edit ${name}`);
      edit.innerHTML = `<svg aria-hidden="true" viewBox="0 0 24 24"><path d="m4 20 4.5-1 10-10a2.1 2.1 0 0 0-3-3l-10 10Z"/><path d="m14 7 3 3"/></svg><span>Edit</span>`;
      const remove = document.createElement("button");
      remove.type = "button";
      remove.className = "member-action destructive-action";
      remove.dataset.deleteMember = profileId;
      remove.setAttribute("aria-label", `Delete ${name}`);
      remove.innerHTML = `<svg aria-hidden="true" viewBox="0 0 24 24"><path d="M4 7h16M9 7V4h6v3M7 7l1 13h8l1-13M10 11v5M14 11v5"/></svg><span>Delete</span>`;
      actions.append(edit, remove);
    }
    card.append(actions);
  }
  return card;
}

export function showFamilyMemberForm(
  root: HTMLElement,
  member?: FamilyMember,
): void {
  const dialog = root.querySelector<HTMLDialogElement>("#family-dialog");
  const form = root.querySelector<HTMLFormElement>("#family-form");
  if (!dialog || !form) throw new Error("Family form is unavailable.");
  form.reset();
  const title = form.querySelector<HTMLElement>("#family-form-title");
  const error = form.querySelector<HTMLElement>("#family-form-error");
  if (title)
    title.textContent = member ? "Edit family member" : "Add family member";
  if (error) {
    error.textContent = "";
    error.hidden = true;
  }
  if (member) {
    const memberId = form.elements.namedItem("memberId") as HTMLInputElement;
    const name = form.elements.namedItem("fullName") as HTMLInputElement;
    const dateOfBirth = form.elements.namedItem(
      "dateOfBirth",
    ) as HTMLInputElement;
    const relationship = form.elements.namedItem(
      "relationship",
    ) as HTMLSelectElement;
    const immigrationRole = form.elements.namedItem(
      "immigrationRole",
    ) as HTMLSelectElement;
    memberId.value = member.id;
    name.value = member.fullName;
    dateOfBirth.value = member.dateOfBirth;
    relationship.value = member.relationship;
    immigrationRole.value = member.immigrationRole;
  }
  dialog.showModal();
}

export function readFamilyMemberInput(form: HTMLFormElement): {
  memberId: string;
  input: FamilyMemberInput;
} {
  const data = new FormData(form);
  return {
    memberId: String(data.get("memberId") ?? ""),
    input: {
      fullName: String(data.get("fullName") ?? "").trim(),
      dateOfBirth: String(data.get("dateOfBirth") ?? ""),
      relationship: String(
        data.get("relationship") ?? "",
      ) as FamilyRelationship,
      immigrationRole: String(
        data.get("immigrationRole") ?? "",
      ) as ImmigrationRole,
    },
  };
}
