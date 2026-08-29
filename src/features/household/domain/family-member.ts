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

export function validateFamilyMemberInput(
  input: FamilyMemberInput,
): string | null {
  const name = input.fullName.trim();
  if (name.length < 1 || name.length > 100)
    return "Enter a name between 1 and 100 characters.";
  if (!isCalendarDate(input.dateOfBirth)) return "Enter a valid date of birth.";
  if (input.dateOfBirth > new Date().toISOString().slice(0, 10))
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
    member.version !== 1 ||
    typeof member.id !== "string" ||
    member.id.length < 1 ||
    member.id.length > 100 ||
    typeof member.fullName !== "string" ||
    typeof member.dateOfBirth !== "string" ||
    !FAMILY_RELATIONSHIPS.includes(member.relationship as FamilyRelationship) ||
    !IMMIGRATION_ROLES.includes(member.immigrationRole as ImmigrationRole) ||
    typeof member.createdAt !== "string" ||
    typeof member.updatedAt !== "string"
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
