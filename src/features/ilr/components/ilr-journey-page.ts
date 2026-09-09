import { createHouseholdSelector } from "../../../shared/components/household-selector";
import { createProgressCard } from "../../../shared/components/progress-card";
import { createUiState } from "../../../shared/components/ui-state";
import {
  applySemanticStatus,
  renderSemanticStatus,
  type SemanticStatusTone,
} from "../../../shared/components/semantic-status";
import { renderEditableCardChevronMarkup } from "../../../shared/components/editable-card-affordance";
import { renderAppShell } from "../../../app/app";
import type { AbsenceCheckResult } from "../../calculation/domain/absence-calculation";
import type { QualifyingPeriodResult } from "../../calculation/domain/qualifying-period-calculation";
import {
  isEnglishRequirementComplete,
  isLifeInUkComplete,
  type LifeEnglishRecord,
} from "../../documents/domain/life-english";
import type { HouseholdMember } from "../../household/domain/household-member";
import type { DocumentVaultProgress } from "../../documents/domain/document-vault";
import { renderImmigrationPermissionDialogMarkup } from "../../immigration/components/immigration-permission-dialog";
import {
  getPermissionRouteLabel,
  type ImmigrationPermission,
} from "../../immigration/domain/immigration-permission";
import type { Trip } from "../../travel/domain/trip";
import {
  buildIlrJourneyTimeline,
  type IlrJourneyTimelineItem,
} from "../domain/ilr-journey-timeline";
import { getIlrOutstandingInformation } from "../domain/ilr-outstanding-information";

export interface IlrJourneyMember {
  member: HouseholdMember;
  period: QualifyingPeriodResult;
  absence: AbsenceCheckResult;
  permissions: ImmigrationPermission[];
  trips: Trip[];
  lifeEnglish: LifeEnglishRecord | null;
  documentVault: DocumentVaultProgress | null;
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

function periodStatusTone(
  status: QualifyingPeriodResult["status"],
): SemanticStatusTone {
  if (status === "period-complete" || status === "application-window-open")
    return "success";
  if (status === "not-yet-complete") return "info";
  if (status === "manual-review") return "review";
  if (status === "unsupported") return "warning";
  return "warning";
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

function timelineItemDateLabel(item: IlrJourneyTimelineItem): string {
  if (item.type === "permission")
    return `${formatDate(item.startDate)} – ${formatDate(item.endDate)}`;
  return item.endDate
    ? `${formatDate(item.startDate)} – ${formatDate(item.endDate)}`
    : `Left the UK ${formatDate(item.startDate)} · Return not recorded`;
}

function createJourneyTimeline(
  permissions: ImmigrationPermission[],
  trips: Trip[],
  period: QualifyingPeriodResult,
  asOfDate: string,
): HTMLElement {
  const list = document.createElement("ol");
  list.className = "ilr-journey-timeline";
  list.setAttribute(
    "aria-label",
    "Chronological immigration and travel timeline",
  );
  const items = buildIlrJourneyTimeline(
    permissions,
    trips,
    period.relevantPermissionIds,
    asOfDate,
  );
  if (items.length === 0) {
    const empty = document.createElement("li");
    const state = createUiState({
      kind: "empty",
      title: "Journey timeline is empty",
      message:
        "Add permission history or travel records to build the journey timeline.",
    });
    empty.className = "ilr-empty-state";
    empty.append(state);
    list.append(empty);
    return list;
  }

  for (const item of items) {
    const row = document.createElement("li");
    row.className = `ilr-timeline-item is-${item.type}`;
    row.dataset.timelineType = item.type;
    row.dataset.timelineId = item.id;
    const marker = document.createElement("span");
    marker.className = "ilr-timeline-marker";
    marker.setAttribute("aria-hidden", "true");
    marker.textContent = item.type === "permission" ? "▣" : "✈";

    const copy = document.createElement("div");
    copy.className = "ilr-timeline-copy";
    const heading = document.createElement("div");
    heading.className = "ilr-timeline-heading";
    const title = document.createElement("strong");
    title.textContent = item.title;
    const type = document.createElement("span");
    type.className = "ilr-timeline-type";
    type.textContent = item.type === "permission" ? "Permission" : "Travel";
    heading.append(title, type);

    const date = document.createElement("span");
    date.className = "ilr-timeline-dates";
    date.textContent = timelineItemDateLabel(item);
    const detail = document.createElement("span");
    detail.className = "ilr-timeline-detail";
    detail.textContent = item.detail;
    copy.append(heading, date, detail);

    const status = document.createElement("span");
    status.className = "ilr-timeline-status";
    if (item.type === "permission") {
      const label = item.current
        ? "Current"
        : item.qualifying
          ? "Qualifying"
          : "Recorded";
      applySemanticStatus(
        status,
        label,
        item.qualifying || item.current ? "success" : "info",
      );
    } else if (item.open) {
      applySemanticStatus(status, "Open trip", "review");
    } else {
      applySemanticStatus(
        status,
        `${item.daysOutside ?? 0} whole days outside`,
        item.exceptional ? "review" : "info",
      );
    }

    row.append(marker, copy, status);
    list.append(row);
  }

  return list;
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
    const empty = createUiState({
      kind: "empty",
      title: "No permission history recorded yet.",
      message:
        "Add the selected member’s immigration permission to start the qualifying-period calculation.",
    });
    empty.classList.add("ilr-empty-state");
    list.append(empty);
    return list;
  }
  for (const [index, permission] of ordered.entries()) {
    const item = document.createElement("button");
    item.type = "button";
    item.className = `ilr-permission-row${index === 0 ? " is-current" : ""}`;
    item.dataset.editPermission = permission.id;
    item.setAttribute(
      "aria-label",
      `Edit ${getPermissionRouteLabel(permission)} permission`,
    );
    item.innerHTML = `<span class="ilr-permission-dot" aria-hidden="true"></span><span class="ilr-permission-copy"><strong></strong><span class="ilr-permission-dates"></span></span><small></small>${renderEditableCardChevronMarkup()}`;
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

function createOutstandingInformation(journey: IlrJourneyMember): HTMLElement {
  const list = document.createElement("div");
  list.className = "ilr-outstanding-list";
  const items = getIlrOutstandingInformation(
    journey.period,
    journey.absence,
    journey.lifeEnglish,
    journey.documentVault,
  );

  if (items.length === 0) {
    const complete = document.createElement("div");
    complete.className = "ilr-outstanding-complete";
    complete.innerHTML = `${renderSemanticStatus({ label: "Complete", tone: "success", className: "ilr-outstanding-state" })}<div><strong>No outstanding tracked items</strong><p>UrbanFox has no missing or review items from the information currently recorded.</p></div>`;
    list.append(complete);
    return list;
  }

  for (const item of items) {
    const row = document.createElement("div");
    row.className = `ilr-outstanding-item is-${item.severity}`;
    row.innerHTML =
      '<span class="ilr-outstanding-icon" aria-hidden="true"></span><div class="ilr-outstanding-copy"><strong></strong><p></p><div class="ilr-outstanding-actions"></div></div><span class="ilr-outstanding-state"></span>';
    const icon = row.querySelector<HTMLElement>(".ilr-outstanding-icon");
    const title = row.querySelector<HTMLElement>("strong");
    const detail = row.querySelector<HTMLElement>("p");
    const actions = row.querySelector<HTMLElement>(".ilr-outstanding-actions");
    const state = row.querySelector<HTMLElement>(".ilr-outstanding-state");
    if (icon) icon.textContent = item.severity === "review" ? "!" : "○";
    if (title) title.textContent = item.label;
    if (detail) detail.textContent = item.detail;
    if (actions) {
      const primaryAction = document.createElement("button");
      primaryAction.type = "button";
      primaryAction.className = "ilr-outstanding-action";
      primaryAction.textContent = item.action.label;
      primaryAction.dataset.ilrAttentionTarget = item.action.target;
      primaryAction.dataset.ilrAttentionId = item.id;
      primaryAction.addEventListener("click", () => {
        if (item.action.target === "add-permission") {
          document.querySelector<HTMLButtonElement>("#ilr-add-permission")?.click();
          return;
        }
        if (item.action.target === "permission-history") {
          document
            .querySelector<HTMLElement>("#ilr-history-title")
            ?.scrollIntoView({ behavior: "smooth", block: "start" });
          return;
        }
        const navigation =
          item.action.target === "travel" ? "Trips" : "Documents";
        document
          .querySelector<HTMLAnchorElement>(
            `[data-navigation="${navigation}"]`,
          )
          ?.click();
      });
      actions.append(primaryAction);

      if (item.externalLink) {
        const officialLink = document.createElement("a");
        officialLink.className = "ilr-outstanding-official-link";
        officialLink.href = item.externalLink.href;
        officialLink.target = "_blank";
        officialLink.rel = "noopener noreferrer";
        officialLink.textContent = `${item.externalLink.label} ↗`;
        actions.append(officialLink);
      }
    }
    if (state)
      applySemanticStatus(
        state,
        item.severity === "review" ? "Review" : "To do",
        item.severity === "review" ? "review" : "todo",
      );
    list.append(row);
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
  const { period, absence, permissions, trips, lifeEnglish } = journey;
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
      statusTone: periodStatusTone(period.status),
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
  root
    .querySelector<HTMLElement>("#ilr-outstanding-information")
    ?.replaceChildren(createOutstandingInformation(journey));
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
    setMilestone(
      milestones,
      "[data-milestone='documents']",
      journey.documentVault?.readinessPercent === 100,
      journey.documentVault
        ? `${journey.documentVault.readinessPercent}% ready`
        : "Unavailable",
    );
  }
  root
    .querySelector<HTMLElement>("#ilr-journey-timeline")
    ?.replaceChildren(
      createJourneyTimeline(permissions, trips, period, asOfDate),
    );
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
    <section class="ilr-section" aria-labelledby="ilr-outstanding-title"><div class="ilr-section-heading"><div><span class="ilr-section-icon" aria-hidden="true">◎</span><h2 id="ilr-outstanding-title">What needs attention</h2></div><span>Based on recorded data</span></div><div id="ilr-outstanding-information"></div></section>
    <section class="ilr-section" aria-labelledby="ilr-milestone-title"><div class="ilr-section-heading"><div><span class="ilr-section-icon" aria-hidden="true">⌁</span><h2 id="ilr-milestone-title">ILR milestone track</h2></div><span>Recorded evidence</span></div><div id="ilr-milestones" class="ilr-milestone-list glass-panel"><div class="ilr-milestone" data-milestone="residence"><span class="ilr-milestone-icon" aria-hidden="true"></span><span>Continuous residence</span><strong></strong></div><div class="ilr-milestone" data-milestone="absence"><span class="ilr-milestone-icon" aria-hidden="true"></span><span>Absence limit ceiling</span><strong></strong></div><div class="ilr-milestone" data-milestone="english"><span class="ilr-milestone-icon" aria-hidden="true"></span><span>English language</span><strong></strong></div><div class="ilr-milestone" data-milestone="life"><span class="ilr-milestone-icon" aria-hidden="true"></span><span>Life in the UK test</span><strong></strong></div><button id="ilr-open-document-vault" class="ilr-milestone ilr-milestone-action" data-milestone="documents" type="button" aria-label="Open Document Vault"><span class="ilr-milestone-icon" aria-hidden="true"></span><span>Document Vault evidence</span><strong></strong>${renderEditableCardChevronMarkup()}</button></div></section>
      <section class="ilr-section" aria-labelledby="ilr-timeline-title"><div class="ilr-section-heading"><div><span class="ilr-section-icon is-secondary" aria-hidden="true">↕</span><h2 id="ilr-timeline-title">Immigration &amp; travel timeline</h2></div><span>Oldest to newest</span></div><div id="ilr-journey-timeline"></div></section>
      <section class="ilr-section" aria-labelledby="ilr-history-title"><div class="ilr-section-heading"><div><span class="ilr-section-icon is-secondary" aria-hidden="true">▱</span><h2 id="ilr-history-title">Permission history</h2></div><button id="ilr-add-permission" class="primary-button ilr-add-permission-button" type="button"><span aria-hidden="true">＋</span><span>Add Permission</span></button></div><div id="ilr-permission-history"></div><p id="permission-page-error" class="form-error" role="alert" hidden></p></section>
    <aside class="notice ilr-notice" aria-labelledby="ilr-notice-title"><span class="notice-icon" aria-hidden="true">i</span><div><h2 id="ilr-notice-title">Estimate only—not an eligibility decision</h2><p>UrbanFox uses information recorded on this device. Always verify current GOV.UK rules and supporting evidence before applying.</p></div></aside>
  </main>
    ${renderImmigrationPermissionDialogMarkup()}`,
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
