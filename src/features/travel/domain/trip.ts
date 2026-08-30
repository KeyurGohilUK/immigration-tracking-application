import {
  getUkCalendarDate,
  isCalendarDate,
} from "../../../shared/date/uk-calendar-date";
import {
  hasValidStoredRecordMetadata,
  isRecordIdentifier,
} from "../../../shared/validation/stored-record";

export interface TripInput {
  departureDate: string;
  returnDate: string;
  destination: string;
  notes: string;
  exceptionalAbsence: boolean;
}

export interface Trip extends TripInput {
  version: 1;
  id: string;
  profileId: string;
  createdAt: string;
  updatedAt: string;
}

export function validateTripInput(input: TripInput): string | null {
  const today = getUkCalendarDate();
  if (!isCalendarDate(input.departureDate))
    return "Enter a valid UK departure date.";
  if (input.departureDate > today)
    return "UK departure cannot be in the future.";
  if (input.returnDate) {
    if (!isCalendarDate(input.returnDate))
      return "Enter a valid UK return date.";
    if (input.returnDate < input.departureDate)
      return "UK return cannot be before departure.";
    if (input.returnDate > today)
      return "Leave UK return blank until the person has returned.";
  }
  const destination = input.destination.trim();
  if (destination.length < 1 || destination.length > 100)
    return "Enter a destination between 1 and 100 characters.";
  if (input.notes.trim().length > 500)
    return "Notes must be 500 characters or fewer.";
  return null;
}

export function isTrip(value: unknown): value is Trip {
  if (!value || typeof value !== "object") return false;
  const trip = value as Partial<Trip>;
  if (
    !hasValidStoredRecordMetadata(trip, 1) ||
    !isRecordIdentifier(trip.profileId) ||
    typeof trip.departureDate !== "string" ||
    typeof trip.returnDate !== "string" ||
    typeof trip.destination !== "string" ||
    trip.destination !== trip.destination.trim() ||
    typeof trip.notes !== "string" ||
    trip.notes !== trip.notes.trim() ||
    typeof trip.exceptionalAbsence !== "boolean"
  )
    return false;
  return validateTripInput(trip as Trip) === null;
}

export function isTripCollection(
  value: unknown,
  profileId: string,
): value is Trip[] {
  if (
    !Array.isArray(value) ||
    !value.every((trip) => isTrip(trip) && trip.profileId === profileId)
  )
    return false;
  if (new Set(value.map(({ id }) => id)).size !== value.length) return false;
  return !value.some((trip, index) =>
    value.slice(index + 1).some((other) => tripsOverlap(trip, other)),
  );
}

function tripsOverlap(left: TripInput, right: TripInput): boolean {
  const openEnd = "9999-12-31";
  const leftEnd = left.returnDate || openEnd;
  const rightEnd = right.returnDate || openEnd;
  return left.departureDate < rightEnd && right.departureDate < leftEnd;
}

export function findOverlappingTrip(
  candidate: TripInput,
  trips: Trip[],
  ignoredTripId = "",
): Trip | null {
  return (
    trips.find(
      (trip) => trip.id !== ignoredTripId && tripsOverlap(candidate, trip),
    ) ?? null
  );
}
