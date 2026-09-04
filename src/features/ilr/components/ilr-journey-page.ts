import { createHouseholdSelector } from "../../../shared/components/household-selector";
import { createProgressCard } from "../../../shared/components/progress-card";
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

function createPermissionHistory(
  permissions: ImmigrationPermission[],
  period: QualifyingPeriodResult,
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
    item.innerHTML = `<span class="ilr-permission-dot" aria-hidden="true"></span><div><strong></strong><span class="ilr-permission-dates"></span></div><small></small>`;
    const title = item.querySelector<HTMLElement>("strong");
    const dates = item.querySelector<HTMLElement>(".ilr-permission-dates");
    const role = item.querySelector<HTMLElement>("small");
    if (title) title.textContent = getPermissionRouteLabel(permission);
    if (dates)
      dates.textContent = `${permission.permissionStartDate.slice(0, 4)} – ${permission.permissionExpiryDate.slice(0, 4)}`;
    if (role) {
      const isQualifying = period.relevantPermissionIds.includes(permission.id);
      role.textContent = isQualifying
        ? "Qualifying (5-year)"
        : "Not in 5-year calculation";
      role.classList.toggle("is-qualifying", isQualifying);
    }
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
  const { period, absence, permissions, lifeEnglish } = journey;
  const latestPermission = [...permissions].sort((left, right) =>
    right.permissionStartDate.localeCompare(left.permissionStartDate),
  )[0];
  const progress = progressForPeriod(period, asOfDate);
  const countdown = daysUntil(period.earliestApplicationDate, asOfDate);
  root.querySelector("#ilr-summary")?.replaceWith(
    createProgressCard({
      id: "ilr-active-route",
      headingLevel: 1,
      kicker: "Active visa permission",
      title: latestPermission
        ? getPermissionRouteLabel(latestPermission)
        : "Permission not recorded",
      subtitle: latestPermission
        ? latestPermission.role === "dependant"
          ? "Dependant permission"
          : "Main applicant permission"
        : "Add permission history to calculate this journey",
      status: periodStatusLabel(period.status),
      requiresReview: ["incomplete", "manual-review", "unsupported"].includes(
        period.status,
      ),
      progressLabel: "Qualifying-period progress",
      progressAccessibleName: "Estimated qualifying-period progress",
      progressPercent: progress,
      metrics: [
        {
          label: "Estimated application window",
          value: formatDate(period.earliestApplicationDate),
          description: "Up to 28 days before the qualifying period",
        },
        {
          label: "Countdown",
          value:
            countdown === null
              ? "Not available"
              : countdown === 0
                ? "Window open"
                : `${countdown.toLocaleString("en-GB")} days`,
          description: "Based on today’s recorded data",
        },
      ],
    }),
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
    ?.replaceChildren(createPermissionHistory(permissions, period));
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
    `<main id="main-content" class="cohort-page ilr-main">
    <div class="ilr-atmosphere" aria-hidden="true"></div>
    <div id="ilr-household-selector"></div>
    <div id="ilr-summary"></div>
    <section class="ilr-section" aria-labelledby="ilr-milestone-title"><div class="ilr-section-heading"><div><span class="ilr-section-icon" aria-hidden="true">⌁</span><h2 id="ilr-milestone-title">ILR milestone track</h2></div><span>Recorded evidence</span></div><div id="ilr-milestones" class="ilr-milestone-list glass-panel"><div class="ilr-milestone" data-milestone="residence"><span class="ilr-milestone-icon" aria-hidden="true"></span><span>Continuous residence</span><strong></strong></div><div class="ilr-milestone" data-milestone="absence"><span class="ilr-milestone-icon" aria-hidden="true"></span><span>Absence limit ceiling</span><strong></strong></div><div class="ilr-milestone" data-milestone="english"><span class="ilr-milestone-icon" aria-hidden="true"></span><span>English language</span><strong></strong></div><div class="ilr-milestone" data-milestone="life"><span class="ilr-milestone-icon" aria-hidden="true"></span><span>Life in the UK test</span><strong></strong></div></div></section>
      <section class="ilr-section" aria-labelledby="ilr-history-title"><div class="ilr-section-heading"><div><span class="ilr-section-icon is-secondary" aria-hidden="true">▱</span><h2 id="ilr-history-title">Permission history</h2></div><button id="ilr-manage-permissions" class="ilr-text-action" type="button">+ Add past visa</button></div><div id="ilr-permission-history"></div></section>
    <aside class="notice ilr-notice" aria-labelledby="ilr-notice-title"><span class="notice-icon" aria-hidden="true">i</span><div><h2 id="ilr-notice-title">Estimate only—not an eligibility decision</h2><p>UrbanFox uses information recorded on this device. Always verify current GOV.UK rules and supporting evidence before applying.</p></div></aside>
  </main>`,
  );
  if (!selectedJourney) return;
  root.querySelector("#ilr-household-selector")?.replaceWith(
    createHouseholdSelector(
      journeys.map(({ member, period }) => ({
        ...member,
        progressPercent: progressForPeriod(period, asOfDate),
      })),
      selectedJourney.member.id,
      "ILR journey",
    ),
  );
  renderSelectedJourney(root, selectedJourney, asOfDate);
}
