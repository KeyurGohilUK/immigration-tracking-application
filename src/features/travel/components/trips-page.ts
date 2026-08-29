import { renderAppShell } from "../../../app/app";
import { calculateCompleteAbsenceDays } from "../../../shared/date/absence-days";
import {
  populatePersonSwitcher,
  renderPersonSwitcherMarkup,
} from "../../household/components/person-switcher";
import type { FamilyMember } from "../../household/domain/family-member";
import type { OwnerProfile } from "../../household/domain/owner-profile";
import type { Trip, TripInput } from "../domain/trip";

export function renderTripsPage(
  root: HTMLElement,
  owner: OwnerProfile,
  members: FamilyMember[],
  selectedProfileId: string,
  trips: Trip[],
): void {
  renderAppShell(
    root,
    "Trips",
    `<main id="main-content" class="record-main"><section class="record-heading" aria-labelledby="trips-title"><div><p class="eyebrow">Selected profile</p><h1 id="trips-title">Trips outside the UK</h1><p>Record actual departures and returns. Open trips remain editable until the person returns.</p></div><div class="record-heading-actions single-action"><button id="add-trip" class="primary-button compact-button" type="button">Add trip</button></div></section>${renderPersonSwitcherMarkup()}<aside class="notice compact-notice" aria-labelledby="trip-warning-title"><span class="notice-icon" aria-hidden="true">i</span><div><h2 id="trip-warning-title">Tracking only—not legal advice</h2><p>A potentially permitted or exceptional absence still needs evidence and qualified manual review.</p></div></aside><section aria-labelledby="trip-list-title"><div class="section-heading"><h2 id="trip-list-title">Travel history</h2><span id="trip-count" class="step-count"></span></div><div id="trip-list" class="record-list"></div></section><p id="trip-page-error" class="form-error" role="alert" hidden></p></main><dialog id="trip-dialog" class="family-dialog" aria-labelledby="trip-form-title"><form id="trip-form" class="family-form" novalidate><div class="app-manager-heading"><div><p class="eyebrow">Encrypted local record</p><h2 id="trip-form-title">Add trip</h2></div><button class="dialog-close" type="button" aria-label="Close trip form">×</button></div><input name="tripId" type="hidden" /><label for="trip-departure">UK departure date</label><input id="trip-departure" name="departureDate" type="date" required /><label for="trip-return">UK return date <span class="optional-label">Optional while outside the UK</span></label><input id="trip-return" name="returnDate" type="date" /><label for="trip-destination">Destination</label><input id="trip-destination" name="destination" maxlength="100" required /><label for="trip-notes">Notes <span class="optional-label">Optional</span></label><textarea id="trip-notes" name="notes" maxlength="500" rows="3"></textarea><label class="checkbox-field" for="exceptional-absence"><input id="exceptional-absence" name="exceptionalAbsence" type="checkbox" /><span><strong>Flag for manual review</strong><small>This may be a permitted or exceptional absence and supporting evidence may be required.</small></span></label><p id="trip-form-error" class="form-error" role="alert" hidden></p><button class="primary-button" type="submit">Save trip</button></form></dialog>`,
  );

  populatePersonSwitcher(root, owner, members, selectedProfileId);
  const list = root.querySelector<HTMLElement>("#trip-list");
  const count = root.querySelector<HTMLElement>("#trip-count");
  if (!list || !count) throw new Error("Trips page could not be rendered.");
  count.textContent = `${trips.length} ${trips.length === 1 ? "trip" : "trips"}`;
  if (trips.length === 0) {
    const empty = document.createElement("div");
    empty.className = "family-empty-state";
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
  card.className = "record-card";
  card.innerHTML = `<div class="record-card-heading"><div><p class="eyebrow">Trip outside the UK</p><h3></h3><div class="trip-badges"></div></div><div class="member-actions"><button class="member-action" type="button">Edit</button><button class="member-action destructive-action" type="button">Delete</button></div></div><dl class="record-dates"><div><dt>Departure</dt><dd></dd></div><div><dt>Return</dt><dd></dd></div><div><dt>Complete days outside</dt><dd></dd></div></dl><p class="trip-notes" hidden></p>`;
  const heading = card.querySelector<HTMLElement>("h3");
  const badges = card.querySelector<HTMLElement>(".trip-badges");
  const dateValues = card.querySelectorAll<HTMLElement>(".record-dates dd");
  const notes = card.querySelector<HTMLElement>(".trip-notes");
  const actions = card.querySelectorAll<HTMLButtonElement>(".member-action");
  if (heading) heading.textContent = trip.destination;
  if (!trip.returnDate) badges?.append(createBadge("Open trip"));
  if (trip.exceptionalAbsence)
    badges?.append(createBadge("Manual review flagged"));
  if (dateValues[0]) dateValues[0].textContent = trip.departureDate;
  if (dateValues[1])
    dateValues[1].textContent = trip.returnDate || "Still away";
  if (dateValues[2])
    dateValues[2].textContent = trip.returnDate
      ? String(
          calculateCompleteAbsenceDays(trip.departureDate, trip.returnDate),
        )
      : "Pending return";
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

function createBadge(label: string): HTMLElement {
  const badge = document.createElement("span");
  badge.className = "member-role";
  badge.textContent = label;
  return badge;
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
