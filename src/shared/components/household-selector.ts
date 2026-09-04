export interface HouseholdSelectorMember {
  id: string;
  fullName: string;
  progressPercent?: number;
}

export function createHouseholdSelector(
  members: readonly HouseholdSelectorMember[],
  selectedId: string,
  context: string,
): HTMLElement {
  const section = document.createElement("section");
  section.className = "household-selector";
  section.setAttribute("aria-label", "Household cohort");
  section.innerHTML = `<div class="household-selector-label"><span>Household cohort</span><strong></strong></div><div class="household-selector-rail" role="group" aria-label="Choose household member"></div>`;
  const selected = members.find(({ id }) => id === selectedId) ?? members[0];
  section.querySelector("strong")!.textContent = selected?.fullName ?? "";
  const rail = section.querySelector<HTMLElement>(".household-selector-rail")!;
  for (const member of members) {
    const button = document.createElement("button");
    const active = member.id === selected?.id;
    button.type = "button";
    button.className = `household-selector-pill${active ? " is-selected" : ""}`;
    button.setAttribute("aria-pressed", String(active));
    button.setAttribute("aria-label", `Show ${member.fullName}'s ${context}`);
    button.innerHTML = `<span class="household-selector-initials" aria-hidden="true"></span><span class="household-selector-name"></span><strong></strong>`;
    button.querySelector(".household-selector-initials")!.textContent =
      member.fullName
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map((part) => part.charAt(0).toUpperCase())
        .join("") || "?";
    button.querySelector(".household-selector-name")!.textContent =
      member.fullName;
    const progress = button.querySelector("strong")!;
    progress.hidden = member.progressPercent === undefined;
    if (member.progressPercent !== undefined)
      progress.textContent = `${Math.round(member.progressPercent)}%`;
    button.addEventListener("click", () => {
      if (active) return;
      section.dispatchEvent(
        new CustomEvent<string>("profile-select", {
          detail: member.id,
          bubbles: true,
        }),
      );
    });
    rail.append(button);
  }
  return section;
}
