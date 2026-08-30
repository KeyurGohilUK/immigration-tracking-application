import {
  getUkCalendarDate,
  isCalendarDate,
} from "../../../shared/date/uk-calendar-date";
import { hasValidStoredRecordMetadata } from "../../../shared/validation/stored-record";

export interface OwnerProfile {
  version: 1;
  id: "owner";
  fullName: string;
  dateOfBirth: string;
  createdAt: string;
  updatedAt: string;
}

export function validateOwnerInput(
  fullName: string,
  dateOfBirth: string,
): string | null {
  const name = fullName.trim();
  if (name.length < 1 || name.length > 100)
    return "Enter a name between 1 and 100 characters.";
  if (!isCalendarDate(dateOfBirth)) return "Enter a valid date of birth.";
  if (dateOfBirth > getUkCalendarDate())
    return "Date of birth cannot be in the future.";
  return null;
}

export function isOwnerProfile(value: unknown): value is OwnerProfile {
  if (!value || typeof value !== "object") return false;
  const profile = value as Partial<OwnerProfile>;
  return (
    hasValidStoredRecordMetadata(profile, 1) &&
    profile.id === "owner" &&
    typeof profile.fullName === "string" &&
    profile.fullName === profile.fullName.trim() &&
    typeof profile.dateOfBirth === "string" &&
    validateOwnerInput(profile.fullName, profile.dateOfBirth) === null
  );
}
