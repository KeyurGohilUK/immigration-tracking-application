import { renderAppShell } from "../../../app/app";
import type { AbsenceCheckResult } from "../../calculation/domain/absence-calculation";
import type { QualifyingPeriodResult } from "../../calculation/domain/qualifying-period-calculation";
import {
  isEnglishRequirementComplete,
  isLifeInUkComplete,
  type LifeEnglishRecord,
} from "../../documents/domain/life-english";
import type { HouseholdMember } from "../../household/domain/household-member";
import {
  getPermissionRouteLabel,
  type ImmigrationPermission,
} from "../../immigration/domain/immigration-permission";

export interface IlrJourneyMember {
  member: HouseholdMember;
  period: QualifyingPeriodResult;
  absence: AbsenceCheckResult;
  permissions: ImmigrationPermission[];
  lifeEnglish: LifeEnglishRecord | null;
}

const DAY_IN_MILLISECONDS = 86_400_000;

function formatDate(value: string | null): string {
  if (!value) return "Not available yet";
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00Z`));
}

function periodStatusLabel(status: QualifyingPeriodResult["status"]): string {
  if (status === "period-complete") return "Period complete";
  if (status === "application-window-open") return "Window open";
  if (status === "not-yet-complete") return "On track";
  if (status === "manual-review") return "Review needed";
  if (status === "unsupported") return "Route review";
  return "Setup incomplete";
}

function progressForPeriod(
  period: QualifyingPeriodResult,
  asOfDate: string,
): number {
  if (!period.qualifyingStartDate || !period.qualifyingCompletionDate) return 0;
  const start = Date.parse(`${period.qualifyingStartDate}T00:00:00Z`);
  const end = Date.parse(`${period.qualifyingCompletionDate}T00:00:00Z`);
  const current = Date.parse(`${asOfDate}T00:00:00Z`);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start)
    return 0;
  return Math.max(0, Math.min(100, ((current - start) / (end - start)) * 100));
}

function daysUntil(value: string | null, asOfDate: string): number | null {
  if (!value) return null;
  return Math.max(
    0,
    Math.ceil(
      (Date.parse(`${value}T00:00:00Z`) - Date.parse(`${asOfDate}T00:00:00Z`)) /
        DAY_IN_MILLISECONDS,
    ),
  );
}

function memberInitials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}

function createMemberPill(
  journey: IlrJourneyMember,
  selectedProfileId: string,
  asOfDate: string,
): HTMLButtonElement {
  const button = document.createElement("button");
  const selected = journey.member.id === selectedProfileId;
  button.type = "button";
  button.className = `ilr-person-pill${selected ? " is-selected" : ""}`;
  button.dataset.ilrProfile = journey.member.id;
  button.setAttribute("aria-pressed", String(selected));
  button.setAttribute(
    "aria-label",
    `Show ${journey.member.fullName}'s ILR journey`,
  );
  button.innerHTML = `<span class="ilr-person-initials" aria-hidden="true"></span><span class="ilr-person-name"></span><strong></strong>`;
  const initials = button.querySelector<HTMLElement>(".ilr-person-initials");
  const name = button.querySelector<HTMLElement>(".ilr-person-name");
  const progress = button.querySelector<HTMLElement>("strong");
  if (initials) initials.textContent = memberInitials(journey.member.fullName);
  if (name) name.textContent = journey.member.fullName;
  if (progress)
    progress.textContent = `${Math.round(progressForPeriod(journey.period, asOfDate))}%`;
  return button;
}

function createPermissionHistory(
  permissions: ImmigrationPermission[],
): HTMLElement {
  const list = document.createElement("div");
  list.className = "ilr-permission-list";
  const ordered = [...permissions].sort((left, right) =>
    right.permissionStartDate.localeCompare(left.permissionStartDate),
  );
  if (ordered.length === 0) {
    const empty = document.createElement("p");
    empty.className = "ilr-empty-state";
    empty.textContent = "No permission history recorded yet.";
    list.append(empty);
    return list;
  }
  for (const [index, permission] of ordered.entries()) {
    const item = document.createElement("div");
    item.className = `ilr-permission-row${index === 0 ? " is-current" : ""}`;
    item.innerHTML = `<span class="ilr-permission-dot" aria-hidden="true"></span><div><strong></strong><span></span></div><small></small>`;
    const title = item.querySelector<HTMLElement>("strong");
    const dates = item.querySelector<HTMLElement>("div span");
    const role = item.querySelector<HTMLElement>("small");
    if (title) title.textContent = getPermissionRouteLabel(permission);
    if (dates)
      dates.textContent = `${formatDate(permission.permissionStartDate)} – ${formatDate(permission.permissionExpiryDate)}`;
    if (role)
      role.textContent =
        permission.role === "dependant" ? "Dependant" : "Main applicant";
    list.append(item);
  }
  return list;
}

function setMilestone(
  container: HTMLElement,
  selector: string,
  complete: boolean,
  value: string,
): void {
  const row = container.querySelector<HTMLElement>(selector);
  if (!row) return;
  row.classList.toggle("is-complete", complete);
  const icon = row.querySelector<HTMLElement>(".ilr-milestone-icon");
  const output = row.querySelector<HTMLElement>("strong");
  if (icon) icon.textContent = complete ? "✓" : "○";
  if (output) output.textContent = value;
}

function renderSelectedJourney(
  root: HTMLElement,
  journey: IlrJourneyMember,
  asOfDate: string,
): void {
  const { member, period, absence, permissions, lifeEnglish } = journey;
  const latestPermission = [...permissions].sort((left, right) =>
    right.permissionStartDate.localeCompare(left.permissionStartDate),
  )[0];
  const progress = progressForPeriod(period, asOfDate);
  const countdown = daysUntil(period.earliestApplicationDate, asOfDate);
  const values: Array<[string, string]> = [
    ["#ilr-active-name", member.fullName],
    [
      "#ilr-active-route",
      latestPermission
        ? getPermissionRouteLabel(latestPermission)
        : "Permission not recorded",
    ],
    [
      "#ilr-active-role",
      latestPermission
        ? latestPermission.role === "dependant"
          ? "Dependant permission"
          : "Main applicant permission"
        : "Add permission history to calculate this journey",
    ],
    ["#ilr-active-status", periodStatusLabel(period.status)],
    ["#ilr-progress-value", `${Math.round(progress)}% complete`],
    ["#ilr-application-date", formatDate(period.earliestApplicationDate)],
    [
      "#ilr-countdown",
      countdown === null
        ? "Not available"
        : countdown === 0
          ? "Window open"
          : `${countdown.toLocaleString("en-GB")} days`,
    ],
  ];
  for (const [selector, value] of values) {
    const element = root.querySelector<HTMLElement>(selector);
    if (element) element.textContent = value;
  }
  root
    .querySelector<HTMLElement>("#ilr-progress-bar")
    ?.style.setProperty("--ilr-progress", `${progress}%`);
  root
    .querySelector<HTMLElement>("#ilr-progress-bar")
    ?.setAttribute("aria-valuenow", String(Math.round(progress)));
  root
    .querySelector<HTMLElement>(".ilr-status-chip")
    ?.classList.toggle(
      "requires-review",
      ["incomplete", "manual-review", "unsupported"].includes(period.status),
    );
  const milestones = root.querySelector<HTMLElement>("#ilr-milestones");
  if (milestones) {
    setMilestone(
      milestones,
      "[data-milestone='residence']",
      progress >= 100,
      period.qualifyingStartDate
        ? `${Math.round(progress)}% recorded`
        : "Not calculated",
    );
    setMilestone(
      milestones,
      "[data-milestone='absence']",
      absence.status === "within-recorded-limit",
      absence.status === "incomplete" || absence.status === "unsupported"
        ? "Not calculated"
        : `${absence.maximumRecordedDays} / 180 days`,
    );
    setMilestone(
      milestones,
      "[data-milestone='english']",
      isEnglishRequirementComplete(lifeEnglish),
      lifeEnglish?.englishStatus === "exempt"
        ? "Exempt"
        : isEnglishRequirementComplete(lifeEnglish)
          ? "Recorded"
          : "To do",
    );
    setMilestone(
      milestones,
      "[data-milestone='life']",
      isLifeInUkComplete(lifeEnglish),
      lifeEnglish?.lifeInUkStatus === "exempt"
        ? "Exempt"
        : isLifeInUkComplete(lifeEnglish)
          ? "Passed"
          : "To do",
    );
  }
  root
    .querySelector<HTMLElement>("#ilr-permission-history")
    ?.replaceChildren(createPermissionHistory(permissions));
}

export function renderIlrJourneyPage(
  root: HTMLElement,
  journeys: IlrJourneyMember[],
  selectedProfileId: string,
  asOfDate: string,
): void {
  const selectedJourney =
    journeys.find(({ member }) => member.id === selectedProfileId) ??
    journeys[0];
  renderAppShell(
    root,
    "ILR",
    `<main id="main-content" class="ilr-main">
    <div class="ilr-atmosphere" aria-hidden="true"></div>
    <section class="ilr-cohort" aria-labelledby="ilr-cohort-title"><div class="ilr-section-label"><span id="ilr-cohort-title">Household cohort</span><strong id="ilr-active-name"></strong></div><div id="ilr-person-switcher" class="ilr-person-switcher" role="group" aria-label="Choose household member"></div></section>
    <section class="ilr-active-card glass-panel-floating" aria-labelledby="ilr-active-route"><div class="ilr-gradient-edge" aria-hidden="true"></div><div class="ilr-active-heading"><div><span class="ilr-kicker">Active visa permission</span><h1 id="ilr-active-route"></h1><p id="ilr-active-role"></p></div><span class="ilr-status-chip"><i aria-hidden="true"></i><span id="ilr-active-status"></span></span></div><div class="ilr-progress-summary"><div><span>Qualifying-period progress</span><strong id="ilr-progress-value"></strong></div><div id="ilr-progress-bar" class="ilr-progress-track" role="progressbar" aria-label="Estimated qualifying-period progress"><span></span></div></div><div class="ilr-date-grid"><div><span>Estimated application window</span><strong id="ilr-application-date"></strong><small>Up to 28 days before the qualifying period</small></div><div><span>Countdown</span><strong id="ilr-countdown"></strong><small>Based on today’s recorded data</small></div></div></section>
    <section class="ilr-section" aria-labelledby="ilr-milestone-title"><div class="ilr-section-heading"><div><span class="ilr-section-icon" aria-hidden="true">⌁</span><h2 id="ilr-milestone-title">ILR milestone track</h2></div><span>Recorded evidence</span></div><div id="ilr-milestones" class="ilr-milestone-list glass-panel"><div class="ilr-milestone" data-milestone="residence"><span class="ilr-milestone-icon" aria-hidden="true"></span><span>Continuous residence</span><strong></strong></div><div class="ilr-milestone" data-milestone="absence"><span class="ilr-milestone-icon" aria-hidden="true"></span><span>Absence limit ceiling</span><strong></strong></div><div class="ilr-milestone" data-milestone="english"><span class="ilr-milestone-icon" aria-hidden="true"></span><span>English language</span><strong></strong></div><div class="ilr-milestone" data-milestone="life"><span class="ilr-milestone-icon" aria-hidden="true"></span><span>Life in the UK test</span><strong></strong></div></div></section>
    <section class="ilr-section" aria-labelledby="ilr-history-title"><div class="ilr-section-heading"><div><span class="ilr-section-icon is-secondary" aria-hidden="true">↺</span><h2 id="ilr-history-title">Permission history</h2></div><button id="ilr-manage-permissions" class="ilr-text-action" type="button">Manage visas</button></div><div id="ilr-permission-history"></div></section>
    <aside class="notice ilr-notice" aria-labelledby="ilr-notice-title"><span class="notice-icon" aria-hidden="true">i</span><div><h2 id="ilr-notice-title">Estimate only—not an eligibility decision</h2><p>UrbanFox uses information recorded on this device. Always verify current GOV.UK rules and supporting evidence before applying.</p></div></aside>
  </main>`,
  );
  const switcher = root.querySelector<HTMLElement>("#ilr-person-switcher");
  if (!switcher || !selectedJourney) return;
  for (const journey of journeys)
    switcher.append(
      createMemberPill(journey, selectedJourney.member.id, asOfDate),
    );
  renderSelectedJourney(root, selectedJourney, asOfDate);
}
