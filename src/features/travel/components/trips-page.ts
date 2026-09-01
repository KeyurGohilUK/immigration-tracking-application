import { renderAppShell } from "../../../app/app";
import { calculateCompleteAbsenceDays } from "../../../shared/date/absence-days";
import {
  populatePersonSwitcher,
  renderPersonSwitcherMarkup,
} from "../../household/components/person-switcher";
import type { HouseholdMember } from "../../household/domain/household-member";
import type { Trip, TripInput } from "../domain/trip";

const ROLLING_ABSENCE_LIMIT = 180;

type TravelAbsenceStatus =
  | "incomplete"
  | "manual-review"
  | "potentially-over-limit"
  | "within-recorded-limit"
  | "unsupported";

export interface TravelOverview {
  maximumRecordedDays: number | null;
  absenceStatus: TravelAbsenceStatus | null;
  earliestApplicationDate: string | null;
  asOfDate: string;
}

export function renderTripsPage(
  root: HTMLElement,
  members: HouseholdMember[],
  selectedProfileId: string,
  trips: Trip[],
  overview?: TravelOverview,
): void {
  const recordedDays = trips.reduce(
    (total, trip) =>
      total +
      (trip.returnDate
        ? calculateCompleteAbsenceDays(trip.departureDate, trip.returnDate)
        : 0),
    0,
  );
  const selectedMember = members.find(({ id }) => id === selectedProfileId);
  const rollingDays = overview?.maximumRecordedDays ?? null;
  const progress =
    rollingDays === null
      ? 0
      : Math.min((rollingDays / ROLLING_ABSENCE_LIMIT) * 100, 100);
  const eligibilityDate = overview?.earliestApplicationDate
    ? formatDisplayDate(overview.earliestApplicationDate)
    : "Not available yet";
  const daysRemaining =
    overview?.earliestApplicationDate && overview.asOfDate
      ? calculateDaysBetween(
          overview.asOfDate,
          overview.earliestApplicationDate,
        )
      : null;

  renderAppShell(
    root,
    "Trips",
    `<main id="main-content" class="record-main travel-main travel-page">
      <section class="travel-hero" aria-labelledby="trips-title">
        <div class="travel-hero-copy">
          <span id="travel-profile-pill" class="travel-profile-pill"></span>
          <h1 id="trips-title">Travel Timeline</h1>
          <p>Track recorded absences against the rolling 180-day limit and keep every trip organised for the selected household member.</p>
        </div>
        <button id="add-trip" class="primary-button travel-add-button" type="button">
          <span aria-hidden="true">＋</span>
          <span>Add Trip</span>
        </button>
      </section>

      <section class="travel-profile-picker glass-panel" aria-label="Choose a household profile">
        ${renderPersonSwitcherMarkup()}
      </section>

      <section class="travel-bento" aria-label="Travel overview">
        <div class="travel-stat-stack">
          <article class="travel-limit-card glass-panel-floating">
            <div class="travel-card-glow" aria-hidden="true"></div>
            <div class="travel-stat-heading">
              <h2>Absence Limit</h2>
              <span class="travel-stat-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24"><path d="M12 3a9 9 0 1 0 9 9h-9Z"/><path d="M15 3.5A8.5 8.5 0 0 1 20.5 9H15Z"/></svg>
              </span>
            </div>
            <p class="travel-limit-value">
              <strong>${rollingDays ?? "—"}</strong>
              <span>/ ${ROLLING_ABSENCE_LIMIT} days</span>
            </p>
            <div class="travel-progress" aria-label="Recorded rolling absence usage">
              <span style="width: ${progress.toFixed(1)}%"></span>
            </div>
            <p class="travel-stat-copy">${getAbsenceStatusCopy(overview?.absenceStatus ?? null)}</p>
          </article>

          <article class="travel-ilr-card glass-panel">
            <div class="travel-stat-heading">
              <h2>ILR Estimate</h2>
              <span class="travel-stat-icon travel-stat-icon-secondary" aria-hidden="true">
                <svg viewBox="0 0 24 24"><rect x="4" y="5" width="16" height="15" rx="2"/><path d="M8 3v4M16 3v4M4 10h16M8 14l2 2 5-5"/></svg>
              </span>
            </div>
            <p class="travel-estimate-label">Earliest estimated application</p>
            <p class="travel-estimate-date">${eligibilityDate}</p>
            <p class="travel-estimate-chip">${formatRemainingDays(daysRemaining)}</p>
          </article>

          <article class="travel-recorded-card glass-panel">
            <p class="eyebrow">Recorded travel</p>
            <div class="travel-recorded-summary">
              <strong>${recordedDays}</strong>
              <span>complete days</span>
            </div>
            <small>${trips.length} ${trips.length === 1 ? "trip" : "trips"} stored locally and encrypted</small>
          </article>
        </div>

        <section class="travel-recent-panel glass-panel" aria-labelledby="trip-list-title">
          <div class="travel-recent-heading">
            <div>
              <p class="eyebrow">Chronological record</p>
              <h2 id="trip-list-title">Recent Travel</h2>
            </div>
            <span id="trip-count" class="travel-count-pill"></span>
          </div>
          <div id="trip-list" class="travel-timeline travel-timeline-premium"></div>
        </section>
      </section>

      <aside class="notice compact-notice travel-notice" aria-labelledby="trip-warning-title">
        <span class="notice-icon" aria-hidden="true">i</span>
        <div>
          <h2 id="trip-warning-title">Tracking only—not legal advice</h2>
          <p>The 180-day figure is a recorded rolling check only. Exceptional absences and route-specific circumstances may require qualified advice.</p>
        </div>
      </aside>
      <p id="trip-page-error" class="form-error" role="alert" hidden></p>
    </main>

    <dialog id="trip-dialog" class="family-dialog member-profile-dialog trip-profile-dialog" aria-labelledby="trip-form-title">
      <form id="trip-form" class="family-form member-profile-form trip-profile-form" novalidate>
        <button class="dialog-close member-profile-close trip-profile-close" type="button" aria-label="Close trip form">×</button>
        <div class="member-profile-header trip-profile-header">
          <div class="member-profile-icon trip-profile-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24"><path d="M4 16h16M7 16l2-6 4 3 3-7 2 10"/><path d="M15.5 5.5 18 3m0 0h-3m3 0v3"/></svg>
          </div>
          <p class="eyebrow">Encrypted local record</p>
          <h2 id="trip-form-title">Add trip</h2>
          <p>Record this journey for the selected household member. Dates are used in the rolling absence calculation.</p>
        </div>
        <input name="tripId" type="hidden" />
        <div class="member-profile-fields trip-profile-fields">
          <div class="member-profile-field">
            <label for="trip-departure">UK departure date</label>
            <div class="member-profile-control">
              <span class="member-profile-control-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24"><rect x="4" y="6" width="16" height="14" rx="2"/><path d="M8 3v5M16 3v5M4 10h16"/></svg>
              </span>
              <input id="trip-departure" name="departureDate" type="date" required />
            </div>
          </div>
          <div class="member-profile-field">
            <label for="trip-return">UK return date <span class="optional-label">Optional while outside the UK</span></label>
            <div class="member-profile-control">
              <span class="member-profile-control-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24"><rect x="4" y="6" width="16" height="14" rx="2"/><path d="M8 3v5M16 3v5M4 10h16"/></svg>
              </span>
              <input id="trip-return" name="returnDate" type="date" />
            </div>
          </div>
          <div class="member-profile-field">
            <label for="trip-destination">Destination</label>
            <div class="member-profile-control">
              <span class="member-profile-control-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24"><path d="M12 21s6-5.1 6-11a6 6 0 1 0-12 0c0 5.9 6 11 6 11Z"/><circle cx="12" cy="10" r="2"/></svg>
              </span>
              <input id="trip-destination" name="destination" maxlength="100" required />
            </div>
          </div>
          <div class="member-profile-field">
            <label for="trip-notes">Notes <span class="optional-label">Optional</span></label>
            <div class="member-profile-control trip-notes-control">
              <span class="member-profile-control-icon trip-notes-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24"><path d="M5 4h14v16H5Z"/><path d="M8 8h8M8 12h8M8 16h5"/></svg>
              </span>
              <textarea id="trip-notes" name="notes" maxlength="500" rows="3"></textarea>
            </div>
          </div>
        </div>
        <label class="checkbox-field trip-review-card" for="exceptional-absence">
          <input id="exceptional-absence" name="exceptionalAbsence" type="checkbox" />
          <span><strong>Flag for manual review</strong><small>This may be a permitted or exceptional absence and supporting evidence may be required.</small></span>
        </label>
        <p id="trip-form-error" class="form-error" role="alert" hidden></p>
        <button class="primary-button family-save-button member-profile-save trip-profile-save" type="submit"><span>Save trip</span><svg aria-hidden="true" viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg></button>
      </form>
    </dialog>`,
  );

  const profilePill = root.querySelector<HTMLElement>("#travel-profile-pill");
  if (profilePill)
    profilePill.textContent = selectedMember?.fullName ?? "Selected profile";

  populatePersonSwitcher(root, members, selectedProfileId);
  const list = root.querySelector<HTMLElement>("#trip-list");
  const count = root.querySelector<HTMLElement>("#trip-count");
  if (!list || !count) throw new Error("Trips page could not be rendered.");
  count.textContent = `${trips.length} ${trips.length === 1 ? "trip" : "trips"}`;
  if (trips.length === 0) {
    const empty = document.createElement("div");
    empty.className = "family-empty-state travel-empty-state";
    empty.innerHTML =
      "<h3>No trips recorded</h3><p>Add each trip outside the UK for the selected profile. Do not combine different people’s travel.</p>";
    list.append(empty);
    return;
  }
  for (const trip of [...trips].sort((left, right) =>
    right.departureDate.localeCompare(left.departureDate),
  )) {
    list.append(createTripCard(trip));
  }
}

function createTripCard(trip: Trip): HTMLElement {
  const card = document.createElement("article");
  const days = trip.returnDate
    ? calculateCompleteAbsenceDays(trip.departureDate, trip.returnDate)
    : null;
  card.className = `timeline-entry travel-entry${trip.returnDate ? "" : " is-open"}`;
  card.innerHTML = `
    <span class="timeline-marker travel-timeline-marker" aria-hidden="true"></span>
    <div class="timeline-entry-content travel-entry-card glass-panel">
      <div class="travel-entry-topline">
        <div class="travel-entry-copy">
          <div class="travel-entry-title-row">
            <h3></h3>
            <div class="trip-badges"></div>
          </div>
          <p class="travel-entry-location">Trip outside the UK</p>
        </div>
        <div class="travel-entry-duration">
          <strong></strong>
          <span></span>
        </div>
      </div>
      <p class="trip-notes travel-entry-note" hidden></p>
      <div class="member-actions travel-entry-actions">
        <button class="member-action" type="button">Edit</button>
        <button class="member-action destructive-action" type="button">Delete</button>
      </div>
    </div>`;

  const heading = card.querySelector<HTMLElement>("h3");
  const badges = card.querySelector<HTMLElement>(".trip-badges");
  const duration = card.querySelector<HTMLElement>(
    ".travel-entry-duration strong",
  );
  const dates = card.querySelector<HTMLElement>(".travel-entry-duration span");
  const notes = card.querySelector<HTMLElement>(".trip-notes");
  const actions = card.querySelectorAll<HTMLButtonElement>(".member-action");

  if (heading) heading.textContent = trip.destination;
  if (!trip.returnDate) badges?.append(createBadge("Open trip", "is-open"));
  if (trip.exceptionalAbsence)
    badges?.append(createBadge("Manual review", "requires-review"));
  if (duration)
    duration.textContent =
      days === null ? "Open" : `${days} ${days === 1 ? "Day" : "Days"}`;
  if (dates)
    dates.textContent = trip.returnDate
      ? `${formatDisplayDate(trip.departureDate)} – ${formatDisplayDate(trip.returnDate)}`
      : `${formatDisplayDate(trip.departureDate)} – Still away`;
  if (notes && trip.notes) {
    notes.textContent = trip.notes;
    notes.hidden = false;
  }

  const edit = actions[0];
  const remove = actions[1];
  if (edit) {
    edit.dataset.editTrip = trip.id;
    edit.setAttribute("aria-label", `Edit trip to ${trip.destination}`);
  }
  if (remove) {
    remove.dataset.deleteTrip = trip.id;
    remove.setAttribute("aria-label", `Delete trip to ${trip.destination}`);
  }
  return card;
}

function createBadge(label: string, className = ""): HTMLElement {
  const badge = document.createElement("span");
  badge.className = `travel-trip-badge ${className}`.trim();
  badge.textContent = label;
  return badge;
}

function formatDisplayDate(value: string): string {
  const date = new Date(`${value}T00:00:00.000Z`);
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

function calculateDaysBetween(from: string, to: string): number {
  const start = Date.parse(`${from}T00:00:00.000Z`);
  const end = Date.parse(`${to}T00:00:00.000Z`);
  return Math.ceil((end - start) / 86_400_000);
}

function formatRemainingDays(days: number | null): string {
  if (days === null) return "Add immigration history to calculate";
  if (days > 0) return `~${days} days remaining`;
  if (days === 0) return "Estimated application window starts today";
  return "Estimated application window reached";
}

function getAbsenceStatusCopy(status: TravelAbsenceStatus | null): string {
  switch (status) {
    case "within-recorded-limit":
      return "Recorded history is within the rolling 12-month limit.";
    case "potentially-over-limit":
      return "Recorded history may exceed the rolling 180-day limit.";
    case "manual-review":
      return "Some recorded absences need manual review before relying on this total.";
    case "incomplete":
      return "Complete the open or missing records to calculate the rolling limit.";
    case "unsupported":
      return "The selected immigration route is not supported by this absence check.";
    default:
      return "Add immigration history to calculate the rolling 12-month limit.";
  }
}

export function showTripForm(root: HTMLElement, trip?: Trip): void {
  const dialog = root.querySelector<HTMLDialogElement>("#trip-dialog");
  const form = root.querySelector<HTMLFormElement>("#trip-form");
  if (!dialog || !form) throw new Error("Trip form is unavailable.");
  form.reset();
  const title = form.querySelector<HTMLElement>("#trip-form-title");
  const error = form.querySelector<HTMLElement>("#trip-form-error");
  if (title) title.textContent = trip ? "Edit trip" : "Add trip";
  if (error) {
    error.textContent = "";
    error.hidden = true;
  }
  if (trip) {
    (form.elements.namedItem("tripId") as HTMLInputElement).value = trip.id;
    (form.elements.namedItem("departureDate") as HTMLInputElement).value =
      trip.departureDate;
    (form.elements.namedItem("returnDate") as HTMLInputElement).value =
      trip.returnDate;
    (form.elements.namedItem("destination") as HTMLInputElement).value =
      trip.destination;
    (form.elements.namedItem("notes") as HTMLTextAreaElement).value =
      trip.notes;
    (
      form.elements.namedItem("exceptionalAbsence") as HTMLInputElement
    ).checked = trip.exceptionalAbsence;
  }
  dialog.showModal();
}

export function readTripInput(form: HTMLFormElement): {
  tripId: string;
  input: TripInput;
} {
  const data = new FormData(form);
  return {
    tripId: String(data.get("tripId") ?? ""),
    input: {
      departureDate: String(data.get("departureDate") ?? ""),
      returnDate: String(data.get("returnDate") ?? ""),
      destination: String(data.get("destination") ?? "").trim(),
      notes: String(data.get("notes") ?? "").trim(),
      exceptionalAbsence: data.get("exceptionalAbsence") === "on",
    },
  };
}
