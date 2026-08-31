import {
  getUkCalendarDate,
  isCalendarDate,
} from "../../../shared/date/uk-calendar-date";
import { hasValidStoredRecordMetadata } from "../../../shared/validation/stored-record";

export const IMMIGRATION_ROLES = [
  "main-applicant",
  "dependant",
  "not-set",
] as const;

export type ImmigrationRole = (typeof IMMIGRATION_ROLES)[number];

export interface HouseholdMemberInput {
  fullName: string;
  dateOfBirth: string;
  immigrationRole: ImmigrationRole;
}

export interface HouseholdMember extends HouseholdMemberInput {
  version: 1;
  id: string;
  createdAt: string;
  updatedAt: string;
}

export function validateHouseholdMemberInput(
  input: HouseholdMemberInput,
): string | null {
  const name = input.fullName.trim();
  if (name.length < 1 || name.length > 100)
    return "Enter a name between 1 and 100 characters.";
  if (!isCalendarDate(input.dateOfBirth)) return "Enter a valid date of birth.";
  if (input.dateOfBirth > getUkCalendarDate())
    return "Date of birth cannot be in the future.";
  if (!IMMIGRATION_ROLES.includes(input.immigrationRole))
    return "Choose an immigration role.";
  return null;
}

export function isHouseholdMember(value: unknown): value is HouseholdMember {
  if (!value || typeof value !== "object") return false;
  const member = value as Partial<HouseholdMember>;
  if (
    !hasValidStoredRecordMetadata(member, 1) ||
    typeof member.id !== "string" ||
    member.id.length === 0 ||
    typeof member.fullName !== "string" ||
    member.fullName !== member.fullName.trim() ||
    typeof member.dateOfBirth !== "string" ||
    !IMMIGRATION_ROLES.includes(member.immigrationRole as ImmigrationRole)
  )
    return false;
  return validateHouseholdMemberInput(member as HouseholdMember) === null;
}

export function isHouseholdMemberCollection(
  value: unknown,
): value is HouseholdMember[] {
  if (!Array.isArray(value) || !value.every(isHouseholdMember)) return false;
  return new Set(value.map(({ id }) => id)).size === value.length;
}
