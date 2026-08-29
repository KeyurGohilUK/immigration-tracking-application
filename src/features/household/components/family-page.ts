import { renderAppShell } from "../../../app/app";
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
  ownerName: string,
  members: FamilyMember[],
): void {
  renderAppShell(
    root,
    "Family",
    `<main id="main-content" class="family-main">
      <section class="family-heading" aria-labelledby="family-title">
        <div><p class="eyebrow">Local household</p><h1 id="family-title">Your family</h1><p>Keep each person separate so future permissions, trips, and estimates cannot be mixed.</p></div>
        <button id="add-family-member" class="primary-button compact-button" type="button">Add family member</button>
      </section>
      <p class="local-data-banner"><strong>Stored only on this device.</strong> Family details are encrypted with your local PIN.</p>
      <section aria-labelledby="household-members-title">
        <div class="section-heading"><h2 id="household-members-title">Household members</h2><span id="family-count" class="step-count"></span></div>
        <div id="family-list" class="family-list"></div>
      </section>
      <p id="family-page-error" class="form-error" role="alert" hidden></p>
    </main>
    <dialog id="family-dialog" class="family-dialog" aria-labelledby="family-form-title">
      <form id="family-form" class="family-form" novalidate>
        <div class="app-manager-heading"><div><p class="eyebrow">Encrypted local profile</p><h2 id="family-form-title">Add family member</h2></div><button class="dialog-close" type="button" aria-label="Close family form">×</button></div>
        <input id="family-member-id" name="memberId" type="hidden" />
        <label for="family-full-name">Full name</label>
        <input id="family-full-name" name="fullName" autocomplete="name" maxlength="100" required />
        <label for="family-date-of-birth">Date of birth</label>
        <input id="family-date-of-birth" name="dateOfBirth" type="date" autocomplete="bday" required />
        <label for="family-relationship">Relationship to household owner</label>
        <select id="family-relationship" name="relationship" required><option value="">Choose relationship</option><option value="spouse-or-partner">Spouse or partner</option><option value="child">Child</option><option value="parent">Parent</option><option value="other">Other</option></select>
        <label for="family-immigration-role">Immigration role</label>
        <select id="family-immigration-role" name="immigrationRole" required><option value="not-set">Not set yet</option><option value="main-applicant">Main applicant</option><option value="dependant">Dependant</option></select>
        <p class="field-guidance">Choose “Not set yet” if you are unsure. UrbanFox will not calculate eligibility until the required route details are complete.</p>
        <p id="family-form-error" class="form-error" role="alert" hidden></p>
        <button class="primary-button" type="submit">Save family member</button>
      </form>
    </dialog>`,
  );

  const list = root.querySelector<HTMLElement>("#family-list");
  const count = root.querySelector<HTMLElement>("#family-count");
  if (!list || !count) throw new Error("Family page could not be rendered.");
  count.textContent = `${members.length + 1} ${members.length === 0 ? "person" : "people"}`;

  const ownerCard = createMemberCard(ownerName, "Household owner", "You", null);
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
      ),
    );
  }
}

function createMemberCard(
  name: string,
  relationship: string,
  role: string,
  memberId: string | null,
): HTMLElement {
  const card = document.createElement("article");
  card.className = "family-member-card";
  card.innerHTML = `<div class="member-avatar" aria-hidden="true"></div><div class="member-summary"><h3></h3><p class="member-relationship"></p><span class="member-role"></span></div>`;
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

  if (memberId) {
    const actions = document.createElement("div");
    actions.className = "member-actions";
    const edit = document.createElement("button");
    edit.type = "button";
    edit.className = "member-action";
    edit.dataset.editMember = memberId;
    edit.setAttribute("aria-label", `Edit ${name}`);
    edit.textContent = "Edit";
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "member-action destructive-action";
    remove.dataset.deleteMember = memberId;
    remove.setAttribute("aria-label", `Delete ${name}`);
    remove.textContent = "Delete";
    actions.append(edit, remove);
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
