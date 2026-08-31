import { renderAppShell } from "../../../app/app";
import type { AbsenceCheckResult } from "../../calculation/domain/absence-calculation";
import type { QualifyingPeriodResult } from "../../calculation/domain/qualifying-period-calculation";
import type { HouseholdMember } from "../../household/domain/household-member";

export interface IlrJourneyMember {
  member: HouseholdMember;
  period: QualifyingPeriodResult;
  absence: AbsenceCheckResult;
}

function formatDate(value: string | null): string {
  if (!value) return "Not available yet";
  const date = new Date(`${value}T00:00:00Z`);
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function periodStatusLabel(status: QualifyingPeriodResult["status"]): string {
  switch (status) {
    case "period-complete":
      return "Qualifying period complete";
    case "application-window-open":
      return "Application window open";
    case "not-yet-complete":
      return "Building qualifying period";
    case "manual-review":
      return "Review needed";
    case "unsupported":
      return "Route review needed";
    default:
      return "Setup incomplete";
  }
}

function absenceStatusLabel(status: AbsenceCheckResult["status"]): string {
  switch (status) {
    case "within-recorded-limit":
      return "Recorded absences within limit";
    case "potentially-over-limit":
      return "Recorded absence limit needs review";
    case "manual-review":
      return "Absence review needed";
    case "unsupported":
      return "Absence route needs review";
    default:
      return "More absence information needed";
  }
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

function createJourneyCard(
  journey: IlrJourneyMember,
  asOfDate: string,
): HTMLElement {
  const { member, period, absence } = journey;
  const card = document.createElement("article");
  card.className = "ilr-member-card glass-panel";
  card.dataset.ilrMember = member.id;
  card.innerHTML = `
    <div class="ilr-member-heading">
      <span class="ilr-member-avatar" aria-hidden="true"></span>
      <div>
        <p class="eyebrow">Household member</p>
        <h2></h2>
        <p class="ilr-member-role"></p>
      </div>
      <span class="ilr-member-status"></span>
    </div>
    <div class="ilr-progress-track" aria-label="Estimated qualifying-period progress">
      <span></span>
    </div>
    <div class="ilr-member-dates">
      <div>
        <span>Qualifying start</span>
        <strong class="ilr-start-date"></strong>
      </div>
      <div>
        <span>Earliest estimated application</span>
        <strong class="ilr-application-date"></strong>
      </div>
      <div>
        <span>Five-year point</span>
        <strong class="ilr-completion-date"></strong>
      </div>
    </div>
    <div class="ilr-member-checks">
      <span class="ilr-absence-status"></span>
      <span class="ilr-absence-days"></span>
    </div>
  `;

  const avatar = card.querySelector<HTMLElement>(".ilr-member-avatar");
  const heading = card.querySelector<HTMLElement>("h2");
  const role = card.querySelector<HTMLElement>(".ilr-member-role");
  const status = card.querySelector<HTMLElement>(".ilr-member-status");
  const progress = card.querySelector<HTMLElement>(".ilr-progress-track span");
  const start = card.querySelector<HTMLElement>(".ilr-start-date");
  const application = card.querySelector<HTMLElement>(".ilr-application-date");
  const completion = card.querySelector<HTMLElement>(".ilr-completion-date");
  const absenceStatus = card.querySelector<HTMLElement>(".ilr-absence-status");
  const absenceDays = card.querySelector<HTMLElement>(".ilr-absence-days");

  if (avatar) avatar.textContent = member.fullName.charAt(0).toUpperCase();
  if (heading) heading.textContent = member.fullName;
  if (role)
    role.textContent =
      member.immigrationRole === "main-applicant"
        ? "Main applicant"
        : member.immigrationRole === "dependant"
          ? "Dependant"
          : "Immigration role not set";
  if (status) status.textContent = periodStatusLabel(period.status);
  if (progress)
    progress.style.width = `${progressForPeriod(period, asOfDate).toFixed(1)}%`;
  if (start) start.textContent = formatDate(period.qualifyingStartDate);
  if (application)
    application.textContent = formatDate(period.earliestApplicationDate);
  if (completion)
    completion.textContent = formatDate(period.qualifyingCompletionDate);
  if (absenceStatus)
    absenceStatus.textContent = absenceStatusLabel(absence.status);
  if (absenceDays)
    absenceDays.textContent = `${absence.maximumRecordedDays} recorded days in the highest 12-month window`;

  if (
    ["manual-review", "unsupported", "incomplete"].includes(period.status) ||
    [
      "manual-review",
      "unsupported",
      "incomplete",
      "potentially-over-limit",
    ].includes(absence.status)
  )
    card.classList.add("requires-review");

  return card;
}

export function renderIlrJourneyPage(
  root: HTMLElement,
  journeys: IlrJourneyMember[],
  asOfDate: string,
): void {
  const applicationWindowsOpen = journeys.filter(({ period }) =>
    ["application-window-open", "period-complete"].includes(period.status),
  ).length;
  const reviewsNeeded = journeys.filter(
    ({ period, absence }) =>
      ["manual-review", "unsupported", "incomplete"].includes(period.status) ||
      [
        "manual-review",
        "unsupported",
        "incomplete",
        "potentially-over-limit",
      ].includes(absence.status),
  ).length;

  renderAppShell(
    root,
    "ILR",
    `<main id="main-content" class="ilr-main">
      <section class="ilr-hero glass-panel-floating" aria-labelledby="ilr-title">
        <div class="ilr-hero-glow" aria-hidden="true"></div>
        <div class="ilr-hero-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24"><path d="M12 3 5 7v5c0 4.4 2.7 7.5 7 9 4.3-1.5 7-4.6 7-9V7Z"/><path d="m8.5 12 2.2 2.2 4.8-5"/></svg>
        </div>
        <p class="eyebrow">Final journey</p>
        <h1 id="ilr-title">Your ILR journey</h1>
        <p>Bring each household member’s qualifying period, earliest estimated application date, and recorded absence check into one final view.</p>
        <div class="ilr-hero-summary">
          <div><strong>${journeys.length}</strong><span>${journeys.length === 1 ? "member" : "members"}</span></div>
          <div><strong>${applicationWindowsOpen}</strong><span>application window open</span></div>
          <div><strong>${reviewsNeeded}</strong><span>need review</span></div>
        </div>
      </section>

      <section class="ilr-journey-panel" aria-labelledby="ilr-household-title">
        <div class="section-heading">
          <div>
            <p class="eyebrow">Household journey</p>
            <h2 id="ilr-household-title">Final ILR timeline</h2>
            <p>Each person is assessed separately from their own stored permission and travel history.</p>
          </div>
        </div>
        <div id="ilr-member-list" class="ilr-member-list"></div>
      </section>

      <aside class="notice ilr-notice" aria-labelledby="ilr-notice-title">
        <span class="notice-icon" aria-hidden="true">i</span>
        <div>
          <h2 id="ilr-notice-title">Estimate only—not an eligibility decision</h2>
          <p>UrbanFox uses the information recorded on this device. Always verify current GOV.UK rules, linked dependant requirements, absences, and supporting evidence before applying.</p>
        </div>
      </aside>
    </main>`,
  );

  const list = root.querySelector<HTMLElement>("#ilr-member-list");
  if (!list) throw new Error("ILR journey list could not be rendered.");
  for (const journey of journeys)
    list.append(createJourneyCard(journey, asOfDate));
}
