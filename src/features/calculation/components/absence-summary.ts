import { ABSENCE_RULE } from "../domain/absence-rule";
import type { AbsenceCheckResult } from "../domain/absence-calculation";

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
          : "Add immigration permission history",
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

export function renderAbsenceSummary(
  root: HTMLElement,
  result: AbsenceCheckResult,
): void {
  const summary = root.querySelector<HTMLElement>("#absence-summary");
  if (!summary) return;
  const content = getSummaryContent(result);
  summary.dataset.status = result.status;
  summary.innerHTML = `<div class="section-heading"><div><p class="eyebrow">Official-rule absence check</p><h2 id="absence-summary-title"></h2></div><span id="absence-status" class="step-count"></span></div><p id="absence-description" class="absence-description"></p><p class="calculation-boundary">This checks recorded travel only and does not determine ILR eligibility.</p><dl class="absence-metrics"><div><dt>Maximum recorded</dt><dd id="absence-maximum"></dd></div><div><dt>Rule checked</dt><dd>180 days / 12 months</dd></div></dl><details class="calculation-sources"><summary>Method and official sources</summary><p>Only complete days between departure and return are counted. The maximum is checked across rolling 12-calendar-month periods.</p><ul>${ABSENCE_RULE.sources.map(({ label, url }) => `<li><a href="${url}" target="_blank" rel="noopener noreferrer">${label}</a></li>`).join("")}</ul><small>Rule ${ABSENCE_RULE.id}; rolling method effective ${ABSENCE_RULE.effectiveFrom}; verified ${ABSENCE_RULE.verifiedAt}. Rules can change.</small></details><div class="dashboard-actions"><button id="manage-permissions" class="secondary-button" type="button">Manage immigration history</button><button id="manage-trips" class="primary-button" type="button">Manage trips</button></div>`;
  const title = summary.querySelector<HTMLElement>("#absence-summary-title");
  const status = summary.querySelector<HTMLElement>("#absence-status");
  const description = summary.querySelector<HTMLElement>(
    "#absence-description",
  );
  const maximum = summary.querySelector<HTMLElement>("#absence-maximum");
  if (title) title.textContent = content.title;
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
