import { ABSENCE_RULE } from "../domain/absence-rule";
import type { AbsenceCheckResult } from "../domain/absence-calculation";
import type {
  QualifyingPeriodIssue,
  QualifyingPeriodResult,
} from "../domain/qualifying-period-calculation";
import { SKILLED_WORKER_QUALIFYING_PERIOD_RULE } from "../domain/qualifying-period-rule";

interface SummaryContent {
  label: string;
  title: string;
  description: string;
}

function getSummaryContent(result: AbsenceCheckResult): SummaryContent {
  if (result.status === "potentially-over-limit")
    return {
      label: "Potential limit issue",
      title: `${result.maximumRecordedDays} recorded days in one rolling year`,
      description:
        "The recorded total is above 180 days. This needs qualified review before any application.",
    };
  if (result.status === "manual-review")
    return {
      label: "Manual review",
      title: "This absence history needs manual review",
      description:
        "A transitional or potentially permitted absence cannot be decided safely by this tracker.",
    };
  if (result.status === "unsupported")
    return {
      label: "Calculation unavailable",
      title: "This permission is not supported yet",
      description:
        "The first calculation supports Skilled Worker and Health and Care Worker main applicants only.",
    };
  if (result.status === "incomplete")
    return {
      label: "Incomplete information",
      title: result.issues.includes("missing-grant-date")
        ? "Add the visa grant date"
        : result.issues.includes("open-trip")
          ? "Complete the open trip after returning"
          : "Absence check waiting for permission history",
      description:
        "UrbanFox needs complete records before it can show a recorded absence check.",
    };
  return {
    label: "Within recorded limit",
    title:
      result.maximumRecordedDays === 0
        ? "No complete absence days recorded"
        : `${result.maximumRecordedDays} days at most in one rolling year`,
    description:
      "No recorded rolling 12-month period is above 180 days. This is not an ILR eligibility result.",
  };
}

function getPeriodContent(result: QualifyingPeriodResult): SummaryContent {
  if (result.status === "unsupported")
    return {
      label: "Calculation unavailable",
      title: "This profile is not supported yet",
      description:
        "This calculation currently supports Skilled Worker, Health and Care Worker, and Tier 2 (General) main applicants.",
    };
  if (result.status === "manual-review")
    return {
      label: "Manual review",
      title: result.earliestApplicationDate
        ? `Recorded estimate: ${result.earliestApplicationDate}`
        : "Permission history needs review",
      description:
        "A recorded gap or transitional rule means UrbanFox cannot safely confirm this timing estimate.",
    };
  if (result.status === "incomplete")
    return {
      label: "Incomplete information",
      title: result.earliestApplicationDate
        ? `Recorded estimate: ${result.earliestApplicationDate}`
        : "Add immigration permission history",
      description:
        "Complete or correct the highlighted permission records before relying on this tracking estimate.",
    };
  if (result.status === "period-complete")
    return {
      label: "Recorded period complete",
      title: `Earliest estimated application: ${result.earliestApplicationDate}`,
      description:
        "The recorded five-year timing period has completed. Other settlement requirements still need separate checks.",
    };
  if (result.status === "application-window-open")
    return {
      label: "28-day window reached",
      title: `Earliest estimated application: ${result.earliestApplicationDate}`,
      description:
        "The recorded dates have reached the 28-day early-application window. This is not confirmation of eligibility.",
    };
  return {
    label: "Tracking in progress",
    title: `Earliest estimated application: ${result.earliestApplicationDate}`,
    description:
      "This estimate uses the recorded qualifying permission dates and the current 28-day rule.",
  };
}

const ISSUE_MESSAGES: Record<QualifyingPeriodIssue, string> = {
  "no-permission-history": "Add immigration permission history.",
  "latest-permission-not-supported":
    "The latest recorded permission is not a supported current route.",
  "latest-permission-as-dependant":
    "The latest recorded permission is held as a dependant.",
  "earlier-dependant-time-excluded":
    "Earlier dependant permission has been excluded from this main-applicant period.",
  "earlier-nonqualifying-time-excluded":
    "Earlier non-qualifying permission has been excluded.",
  "gap-in-recorded-permission":
    "A gap was found between recorded qualifying permissions; section 3C or another exception may require manual review.",
  "permission-expired": "The latest recorded permission has expired.",
  "permission-expires-before-estimated-date":
    "The latest permission expires before the estimated date, so another grant may be needed.",
  "missing-grant-date":
    "Add each visa grant date so pre-entry absences and transitional rules can be checked.",
  "pre-2018-permission":
    "Permission granted before 11 January 2018 uses a transitional absence calculation requiring manual review.",
};

export function renderAbsenceSummary(
  root: HTMLElement,
  result: AbsenceCheckResult,
  period: QualifyingPeriodResult,
): void {
  const summary = root.querySelector<HTMLElement>("#absence-summary");
  if (!summary) return;
  const content = getSummaryContent(result);
  const periodContent = getPeriodContent(period);
  const sourceMap = new Map(
    [
      ...SKILLED_WORKER_QUALIFYING_PERIOD_RULE.sources,
      ...ABSENCE_RULE.sources,
    ].map((source) => [source.url, source]),
  );
  summary.dataset.status =
    period.status === "manual-review" || result.status === "manual-review"
      ? "manual-review"
      : period.status === "incomplete" || result.status === "incomplete"
        ? "incomplete"
        : result.status;
  summary.innerHTML = `<div class="section-heading"><div><p class="eyebrow">Official-rule residence tracker</p><h2 id="absence-summary-title"></h2></div><span id="period-status" class="step-count"></span></div><p id="period-description" class="absence-description"></p>${period.issues.length ? `<ul class="calculation-issues">${period.issues.map((issue) => `<li>${ISSUE_MESSAGES[issue]}</li>`).join("")}</ul>` : ""}<dl class="absence-metrics period-metrics"><div><dt>Qualifying start</dt><dd>${period.qualifyingStartDate ?? "Not available"}</dd></div><div><dt>Five years complete</dt><dd>${period.qualifyingCompletionDate ?? "Not available"}</dd></div><div><dt>28-day earliest estimate</dt><dd>${period.earliestApplicationDate ?? "Not available"}</dd></div></dl><div class="calculation-subsection"><div class="section-heading"><div><p class="eyebrow">Recorded absence check</p><h3 id="absence-check-title"></h3></div><span id="absence-status" class="step-count"></span></div><p id="absence-description" class="absence-description"></p><dl class="absence-metrics"><div><dt>Maximum recorded</dt><dd id="absence-maximum"></dd></div><div><dt>Rule checked</dt><dd>180 days / 12 months</dd></div></dl></div><p class="calculation-boundary">Tracking estimate only—not a complete ILR eligibility decision or legal advice.</p><details class="calculation-sources"><summary>Method and official sources</summary><p>The period uses five calendar years and the current 28-day early-application rule. Only qualifying main-applicant permission is included. Complete absence days are checked across rolling 12-calendar-month periods, including recorded pre-entry days after an entry-clearance grant.</p><ul>${[...sourceMap.values()].map(({ label, url }) => `<li><a href="${url}" target="_blank" rel="noopener noreferrer">${label}</a></li>`).join("")}</ul><small>Rules ${SKILLED_WORKER_QUALIFYING_PERIOD_RULE.id} and ${ABSENCE_RULE.id}; verified ${ABSENCE_RULE.verifiedAt}. Rules can change.</small></details><div class="dashboard-actions"><button id="manage-permissions" class="secondary-button" type="button">Manage immigration history</button><button id="manage-trips" class="primary-button" type="button">Manage trips</button></div>`;
  const title = summary.querySelector<HTMLElement>("#absence-summary-title");
  const periodStatus = summary.querySelector<HTMLElement>("#period-status");
  const periodDescription = summary.querySelector<HTMLElement>(
    "#period-description",
  );
  const absenceTitle = summary.querySelector<HTMLElement>(
    "#absence-check-title",
  );
  const status = summary.querySelector<HTMLElement>("#absence-status");
  const description = summary.querySelector<HTMLElement>(
    "#absence-description",
  );
  const maximum = summary.querySelector<HTMLElement>("#absence-maximum");
  if (title) title.textContent = periodContent.title;
  if (periodStatus) periodStatus.textContent = periodContent.label;
  if (periodDescription)
    periodDescription.textContent = periodContent.description;
  if (absenceTitle) absenceTitle.textContent = content.title;
  if (status) status.textContent = content.label;
  if (description) description.textContent = content.description;
  if (maximum)
    maximum.textContent = result.maximumWindow
      ? `${result.maximumRecordedDays} days (${result.maximumWindow.startDate} to ${result.maximumWindow.endDate})`
      : `${result.maximumRecordedDays} days`;
}

export function renderAbsenceSummaryUnavailable(root: HTMLElement): void {
  const summary = root.querySelector<HTMLElement>("#absence-summary");
  if (!summary) return;
  summary.dataset.status = "incomplete";
  summary.innerHTML = `<div><p class="eyebrow">Official-rule absence check</p><h2>Calculation unavailable</h2><p>Your encrypted records could not be opened. No result has been produced.</p></div><div class="dashboard-actions"><button id="manage-permissions" class="secondary-button" type="button">Manage immigration history</button><button id="manage-trips" class="primary-button" type="button">Manage trips</button></div>`;
}
