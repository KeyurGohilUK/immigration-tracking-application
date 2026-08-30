import {
  getUkCalendarDate,
  isCalendarDate,
} from "../../../shared/date/uk-calendar-date";
import { hasValidStoredRecordMetadata } from "../../../shared/validation/stored-record";

export const FAMILY_RELATIONSHIPS = [
  "spouse-or-partner",
  "child",
  "parent",
  "other",
] as const;

export const IMMIGRATION_ROLES = [
  "main-applicant",
  "dependant",
  "not-set",
] as const;

export type FamilyRelationship = (typeof FAMILY_RELATIONSHIPS)[number];
export type ImmigrationRole = (typeof IMMIGRATION_ROLES)[number];

export interface FamilyMemberInput {
  fullName: string;
  dateOfBirth: string;
  relationship: FamilyRelationship;
  immigrationRole: ImmigrationRole;
}

export interface FamilyMember extends FamilyMemberInput {
  version: 1;
  id: string;
  createdAt: string;
  updatedAt: string;
}

export function validateFamilyMemberInput(
  input: FamilyMemberInput,
): string | null {
  const name = input.fullName.trim();
  if (name.length < 1 || name.length > 100)
    return "Enter a name between 1 and 100 characters.";
  if (!isCalendarDate(input.dateOfBirth)) return "Enter a valid date of birth.";
  if (input.dateOfBirth > getUkCalendarDate())
    return "Date of birth cannot be in the future.";
  if (!FAMILY_RELATIONSHIPS.includes(input.relationship))
    return "Choose a relationship.";
  if (!IMMIGRATION_ROLES.includes(input.immigrationRole))
    return "Choose an immigration role.";
  return null;
}

export function isFamilyMember(value: unknown): value is FamilyMember {
  if (!value || typeof value !== "object") return false;
  const member = value as Partial<FamilyMember>;
  if (
    !hasValidStoredRecordMetadata(member, 1) ||
    typeof member.fullName !== "string" ||
    member.fullName !== member.fullName.trim() ||
    typeof member.dateOfBirth !== "string" ||
    !FAMILY_RELATIONSHIPS.includes(member.relationship as FamilyRelationship) ||
    !IMMIGRATION_ROLES.includes(member.immigrationRole as ImmigrationRole)
  )
    return false;
  return validateFamilyMemberInput(member as FamilyMember) === null;
}

export function isFamilyMemberCollection(
  value: unknown,
): value is FamilyMember[] {
  if (!Array.isArray(value) || !value.every(isFamilyMember)) return false;
  return new Set(value.map(({ id }) => id)).size === value.length;
}
