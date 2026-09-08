export const SPONSORSHIP_STATUSES = [
  "sponsored",
  "not-sponsored",
  "unknown",
] as const;
export type SponsorshipStatus = (typeof SPONSORSHIP_STATUSES)[number];

export interface EmploymentRecord {
  version: 1;
  profileId: string;
  employerName: string;
  jobTitle: string;
  sponsorshipStatus: SponsorshipStatus;
  employmentStartDate: string;
  employmentEndDate: string;
  annualSalary: number | null;
  createdAt: string;
  updatedAt: string;
}

export type EmployerLetterTimingStatus =
  | "details-missing"
  | "letter-missing"
  | "recorded-before-window"
  | "review-at-application";

function isDate(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    !Number.isNaN(Date.parse(value + "T00:00:00Z"))
  );
}

export function validateEmploymentRecord(
  record: EmploymentRecord,
): string | null {
  if (!record.employerName.trim()) return "Enter the employer name.";
  if (!record.jobTitle.trim()) return "Enter the job title.";
  if (!SPONSORSHIP_STATUSES.includes(record.sponsorshipStatus))
    return "Choose a sponsorship status.";
  if (!isDate(record.employmentStartDate))
    return "Enter a valid employment start date.";
  if (record.employmentEndDate && !isDate(record.employmentEndDate))
    return "Enter a valid employment end date.";
  if (
    record.employmentEndDate &&
    record.employmentEndDate < record.employmentStartDate
  )
    return "Employment end date cannot be before the start date.";
  if (
    record.annualSalary !== null &&
    (!Number.isFinite(record.annualSalary) ||
      record.annualSalary < 0 ||
      record.annualSalary > 10_000_000)
  )
    return "Enter a valid annual salary.";
  return null;
}

export function isEmploymentCollection(
  value: unknown,
  profileId: string,
): value is EmploymentRecord[] {
  if (!Array.isArray(value) || value.length > 1) return false;
  return value.every((item) => {
    if (!item || typeof item !== "object") return false;
    const record = item as EmploymentRecord;
    return (
      record.version === 1 &&
      record.profileId === profileId &&
      typeof record.employerName === "string" &&
      typeof record.jobTitle === "string" &&
      typeof record.employmentEndDate === "string" &&
      typeof record.createdAt === "string" &&
      typeof record.updatedAt === "string" &&
      validateEmploymentRecord(record) === null
    );
  });
}

export function getEmployerLetterTimingStatus(
  record: EmploymentRecord | null,
  hasEmployerLetter: boolean,
  earliestApplicationDate: string | null,
  asOfDate: string,
): EmployerLetterTimingStatus {
  if (!record) return "details-missing";
  if (!hasEmployerLetter) return "letter-missing";
  if (earliestApplicationDate && asOfDate >= earliestApplicationDate)
    return "review-at-application";
  return "recorded-before-window";
}

export function getEmployerLetterTimingLabel(
  status: EmployerLetterTimingStatus,
): string {
  if (status === "details-missing") return "Add employment details";
  if (status === "letter-missing") return "Employer letter not added";
  if (status === "review-at-application")
    return "Review final employer letter before applying";
  return "Employer letter recorded · review again at application";
}
