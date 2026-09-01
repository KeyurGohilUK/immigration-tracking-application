export const LIFE_IN_UK_STATUSES = [
  "not-recorded",
  "passed",
  "exempt",
] as const;

export const ENGLISH_REQUIREMENT_STATUSES = [
  "not-recorded",
  "met",
  "exempt",
] as const;

export type LifeInUkStatus = (typeof LIFE_IN_UK_STATUSES)[number];
export type EnglishRequirementStatus =
  (typeof ENGLISH_REQUIREMENT_STATUSES)[number];

export interface LifeEnglishInput {
  lifeInUkStatus: LifeInUkStatus;
  lifeInUkPassedDate: string;
  lifeInUkReference: string;
  englishStatus: EnglishRequirementStatus;
  englishEvidenceType: string;
  englishReference: string;
  notes: string;
}

export interface LifeEnglishRecord extends LifeEnglishInput {
  version: 1;
  profileId: string;
  createdAt: string;
  updatedAt: string;
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function validateLifeEnglishInput(
  input: LifeEnglishInput,
): string | null {
  if (
    !LIFE_IN_UK_STATUSES.includes(input.lifeInUkStatus) ||
    !ENGLISH_REQUIREMENT_STATUSES.includes(input.englishStatus)
  )
    return "Choose valid Life in the UK and English statuses.";
  if (
    input.lifeInUkStatus === "passed" &&
    !DATE_PATTERN.test(input.lifeInUkPassedDate)
  )
    return "Enter the Life in the UK pass date.";
  if (
    input.lifeInUkStatus !== "passed" &&
    input.lifeInUkPassedDate.length > 0
  )
    return "Only record a Life in the UK pass date when the test is marked as passed.";
  if (input.lifeInUkReference.trim().length > 120)
    return "Life in the UK reference must be 120 characters or fewer.";
  if (
    input.englishStatus === "met" &&
    input.englishEvidenceType.trim().length === 0
  )
    return "Enter how the English requirement is met.";
  if (input.englishEvidenceType.trim().length > 120)
    return "English evidence type must be 120 characters or fewer.";
  if (input.englishReference.trim().length > 120)
    return "English reference must be 120 characters or fewer.";
  if (input.notes.trim().length > 500)
    return "Notes must be 500 characters or fewer.";
  return null;
}

export function isLifeEnglishRecord(
  value: unknown,
  profileId?: string,
): value is LifeEnglishRecord {
  if (!value || typeof value !== "object") return false;
  const record = value as Partial<LifeEnglishRecord>;
  if (
    record.version !== 1 ||
    typeof record.profileId !== "string" ||
    (profileId !== undefined && record.profileId !== profileId) ||
    typeof record.lifeInUkStatus !== "string" ||
    typeof record.lifeInUkPassedDate !== "string" ||
    typeof record.lifeInUkReference !== "string" ||
    typeof record.englishStatus !== "string" ||
    typeof record.englishEvidenceType !== "string" ||
    typeof record.englishReference !== "string" ||
    typeof record.notes !== "string" ||
    typeof record.createdAt !== "string" ||
    typeof record.updatedAt !== "string"
  )
    return false;
  return validateLifeEnglishInput(record as LifeEnglishRecord) === null;
}

export function isLifeEnglishCollection(
  value: unknown,
  profileId: string,
): value is LifeEnglishRecord[] {
  return (
    Array.isArray(value) &&
    value.length <= 1 &&
    value.every((record) => isLifeEnglishRecord(record, profileId))
  );
}

export function isLifeInUkComplete(
  record: LifeEnglishRecord | null,
): boolean {
  if (!record || record.lifeInUkStatus === "not-recorded") return false;
  return (
    record.lifeInUkStatus === "exempt" ||
    DATE_PATTERN.test(record.lifeInUkPassedDate)
  );
}

export function isEnglishRequirementComplete(
  record: LifeEnglishRecord | null,
): boolean {
  if (!record || record.englishStatus === "not-recorded") return false;
  return (
    record.englishStatus === "exempt" ||
    record.englishEvidenceType.trim().length > 0
  );
}
