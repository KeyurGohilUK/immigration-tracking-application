import { getUkCalendarDate } from "../../../shared/date/uk-calendar-date";

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

function isCalendarDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return false;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(Date.UTC(year, month - 1, day));
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
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
    trip.version !== 1 ||
    typeof trip.id !== "string" ||
    trip.id.length < 1 ||
    trip.id.length > 100 ||
    typeof trip.profileId !== "string" ||
    trip.profileId.length < 1 ||
    trip.profileId.length > 100 ||
    typeof trip.departureDate !== "string" ||
    typeof trip.returnDate !== "string" ||
    typeof trip.destination !== "string" ||
    typeof trip.notes !== "string" ||
    typeof trip.exceptionalAbsence !== "boolean" ||
    typeof trip.createdAt !== "string" ||
    typeof trip.updatedAt !== "string"
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
  return new Set(value.map(({ id }) => id)).size === value.length;
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
