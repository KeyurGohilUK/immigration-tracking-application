import type { ImmigrationPermission } from "../../immigration/domain/immigration-permission";

export interface AddressHistoryInput {
  fullAddress: string;
  startMonth: string;
  endMonth: string;
  isCurrent: boolean;
  notes: string;
}

export interface AddressHistoryEntry extends AddressHistoryInput {
  version: 1;
  id: string;
  profileId: string;
  createdAt: string;
  updatedAt: string;
}

export interface AddressHistoryCoverage {
  requiredMonths: number | null;
  coveredMonths: number;
  complete: boolean;
  gaps: string[];
}

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;
const FIVE_YEAR_ROUTES = new Set([
  "skilled-worker",
  "health-and-care-worker",
  "tier-2-general",
]);

export function validateAddressHistoryInput(
  input: AddressHistoryInput,
): string | null {
  const address = input.fullAddress.trim();
  if (address.length < 5 || address.length > 300)
    return "Enter the full address between 5 and 300 characters.";
  if (!MONTH_PATTERN.test(input.startMonth))
    return "Enter a valid address start month.";
  if (input.isCurrent) {
    if (input.endMonth) return "A current address must not have an end month.";
  } else {
    if (!MONTH_PATTERN.test(input.endMonth))
      return "Enter a valid address end month.";
    if (input.endMonth < input.startMonth)
      return "Address end month must be on or after its start month.";
  }
  if (input.notes.trim().length > 500)
    return "Address notes must be 500 characters or fewer.";
  return null;
}

export function isAddressHistoryEntry(
  value: unknown,
  profileId?: string,
): value is AddressHistoryEntry {
  if (!value || typeof value !== "object") return false;
  const entry = value as Partial<AddressHistoryEntry>;
  if (
    entry.version !== 1 ||
    typeof entry.id !== "string" ||
    entry.id.length === 0 ||
    typeof entry.profileId !== "string" ||
    (profileId !== undefined && entry.profileId !== profileId) ||
    typeof entry.fullAddress !== "string" ||
    typeof entry.startMonth !== "string" ||
    typeof entry.endMonth !== "string" ||
    typeof entry.isCurrent !== "boolean" ||
    typeof entry.notes !== "string" ||
    typeof entry.createdAt !== "string" ||
    typeof entry.updatedAt !== "string"
  )
    return false;
  return validateAddressHistoryInput(entry as AddressHistoryEntry) === null;
}

export function isAddressHistoryCollection(
  value: unknown,
  profileId: string,
): value is AddressHistoryEntry[] {
  if (
    !Array.isArray(value) ||
    !value.every((entry) => isAddressHistoryEntry(entry, profileId))
  )
    return false;
  return new Set(value.map(({ id }) => id)).size === value.length;
}

export function validateAddressHistoryCollection(
  entries: readonly AddressHistoryEntry[],
): string | null {
  const ordered = [...entries].sort((a, b) =>
    a.startMonth.localeCompare(b.startMonth),
  );
  const current = ordered.filter(({ isCurrent }) => isCurrent);
  if (current.length > 1) return "Only one address can be marked as current.";
  for (let index = 1; index < ordered.length; index += 1) {
    const previous = ordered[index - 1];
    const entry = ordered[index];
    if (!previous || !entry) continue;
    const previousEnd = previous.isCurrent ? "9999-12" : previous.endMonth;
    if (entry.startMonth <= previousEnd)
      return "Address periods must not overlap.";
  }
  return null;
}

export function getRequiredAddressHistoryMonths(
  permissions: readonly ImmigrationPermission[],
): number | null {
  const latest = [...permissions].sort((a, b) =>
    b.permissionStartDate.localeCompare(a.permissionStartDate),
  )[0];
  if (!latest || !FIVE_YEAR_ROUTES.has(latest.route)) return null;
  return 60;
}

export function calculateAddressHistoryCoverage(
  entries: readonly AddressHistoryEntry[],
  requiredMonths: number | null,
  asOfMonth: string,
): AddressHistoryCoverage {
  if (requiredMonths === null)
    return { requiredMonths: null, coveredMonths: 0, complete: false, gaps: [] };
  if (!MONTH_PATTERN.test(asOfMonth))
    throw new Error("Address-history as-of month is invalid.");

  const end = monthToIndex(asOfMonth);
  const start = end - requiredMonths + 1;
  const covered = new Set<number>();
  for (const entry of entries) {
    const entryStart = Math.max(start, monthToIndex(entry.startMonth));
    const entryEnd = Math.min(
      end,
      entry.isCurrent ? end : monthToIndex(entry.endMonth),
    );
    for (let month = entryStart; month <= entryEnd; month += 1)
      covered.add(month);
  }

  const gaps: string[] = [];
  let gapStart: number | null = null;
  for (let month = start; month <= end; month += 1) {
    if (!covered.has(month) && gapStart === null) gapStart = month;
    const closesGap =
      gapStart !== null && (covered.has(month) || month === end);
    if (closesGap) {
      const gapEnd = covered.has(month) ? month - 1 : month;
      gaps.push(formatMonthRange(gapStart, gapEnd));
      gapStart = null;
    }
  }

  return {
    requiredMonths,
    coveredMonths: covered.size,
    complete: covered.size >= requiredMonths && gaps.length === 0,
    gaps,
  };
}

function monthToIndex(month: string): number {
  const [year, monthNumber] = month.split("-").map(Number);
  if (!year || !monthNumber) throw new Error("Invalid month.");
  return year * 12 + monthNumber - 1;
}

function indexToMonth(index: number): string {
  const year = Math.floor(index / 12);
  const month = (index % 12) + 1;
  return `${year}-${String(month).padStart(2, "0")}`;
}

function formatMonthRange(start: number, end: number): string {
  const from = indexToMonth(start);
  const to = indexToMonth(end);
  return from === to ? from : `${from} to ${to}`;
}
