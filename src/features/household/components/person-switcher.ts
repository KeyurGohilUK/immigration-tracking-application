import type {
  HouseholdMember,
  ImmigrationRole,
} from "../domain/household-member";

const immigrationRoleLabels: Record<ImmigrationRole, string> = {
  "main-applicant": "Main applicant",
  dependant: "Dependant",
  "not-set": "Immigration role not set",
};

export function renderPersonSwitcherMarkup(): string {
  return `<div class="person-switcher"><div><label for="active-person">Tracking profile</label><strong id="selected-person-name"></strong><span id="selected-person-context"></span></div><select id="active-person" aria-label="Tracking profile"></select></div>`;
}

export function populatePersonSwitcher(
  root: HTMLElement,
  members: HouseholdMember[],
  selectedId: string,
): HTMLSelectElement {
  const select = root.querySelector<HTMLSelectElement>("#active-person");
  const selectedName = root.querySelector<HTMLElement>("#selected-person-name");
  const selectedContext = root.querySelector<HTMLElement>(
    "#selected-person-context",
  );
  if (!select || !selectedName || !selectedContext)
    throw new Error("Profile switcher could not be rendered.");

  for (const member of members) {
    select.add(new Option(member.fullName, member.id));
  }

  const selectedMember =
    members.find(({ id }) => id === selectedId) ?? members[0];
  if (!selectedMember) throw new Error("A household member is required.");
  select.value = selectedMember.id;
  selectedName.textContent = selectedMember.fullName;
  selectedContext.textContent =
    immigrationRoleLabels[selectedMember.immigrationRole];
  return select;
}

export function isKnownProfileId(
  profileId: string,
  members: HouseholdMember[],
): boolean {
  return members.some(({ id }) => id === profileId);
}
