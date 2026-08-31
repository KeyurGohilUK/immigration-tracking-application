import type { OwnerProfile } from "../domain/owner-profile";
import type {
  FamilyMember,
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
  "not-set": "Immigration role not set",
};

export const OWNER_PROFILE_ID = "owner";

export function renderPersonSwitcherMarkup(): string {
  return `<div class="person-switcher"><div><label for="active-person">Tracking profile</label><strong id="selected-person-name"></strong><span id="selected-person-context"></span></div><select id="active-person" aria-label="Tracking profile"></select></div>`;
}

export function populatePersonSwitcher(
  root: HTMLElement,
  owner: OwnerProfile,
  members: FamilyMember[],
  selectedId: string,
): HTMLSelectElement {
  const select = root.querySelector<HTMLSelectElement>("#active-person");
  const selectedName = root.querySelector<HTMLElement>("#selected-person-name");
  const selectedContext = root.querySelector<HTMLElement>(
    "#selected-person-context",
  );
  if (!select || !selectedName || !selectedContext)
    throw new Error("Profile switcher could not be rendered.");

  const ownerOption = new Option(`${owner.fullName} (You)`, owner.id);
  select.add(ownerOption);
  for (const member of members) {
    select.add(new Option(member.fullName, member.id));
  }

  const selectedMember = members.find(({ id }) => id === selectedId);
  const selectedPerson = selectedMember ?? owner;
  select.value = selectedPerson.id;
  selectedName.textContent = selectedPerson.fullName;
  selectedContext.textContent = selectedMember
    ? `${relationshipLabels[selectedMember.relationship]} · ${immigrationRoleLabels[selectedMember.immigrationRole]}`
    : "Primary local profile";
  return select;
}

export function isKnownProfileId(
  profileId: string,
  members: FamilyMember[],
): boolean {
  return (
    profileId === OWNER_PROFILE_ID || members.some(({ id }) => id === profileId)
  );
}
