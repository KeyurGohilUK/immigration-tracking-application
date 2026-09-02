import type { ImmigrationPermission } from "../../immigration/domain/immigration-permission";

export interface StructuredAddress {
  flatBuilding: string;
  houseNumberName: string;
  street: string;
  locality: string;
  townCity: string;
  county: string;
  postcode: string;
}

export interface AddressHistoryInput {
  address: StructuredAddress;
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

export interface AddressHistoryRequirement {
  requiredMonths: number | null;
  startMonth: string | null;
}

const MONTH_PATTERN = /^\d{4}-(0[1-9]|1[0-2])$/;
const UK_POSTCODE_PATTERN =
  /^(GIR\s?0AA|[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2})$/i;
const FIVE_YEAR_ROUTES = new Set([
  "skilled-worker",
  "health-and-care-worker",
  "tier-2-general",
]);

export function validateAddressHistoryInput(
  input: AddressHistoryInput,
): string | null {
  const structuredError = validateStructuredAddress(input.address);
  if (structuredError) return structuredError;
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

export function formatStructuredAddress(address: StructuredAddress): string {
  const streetLine = [address.houseNumberName, address.street]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(" ");
  return [
    address.flatBuilding,
    streetLine,
    address.locality,
    address.townCity,
    address.county,
    normalizeUkPostcode(address.postcode),
  ]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(", ");
}

function normalizeUkPostcode(postcode: string): string {
  const compact = postcode.toUpperCase().replace(/\s+/g, "");
  return compact.length > 3
    ? `${compact.slice(0, -3)} ${compact.slice(-3)}`
    : compact;
}

export function validateStructuredAddress(
  address: StructuredAddress,
): string | null {
  if (!address.houseNumberName.trim())
    return "Enter the house number or house name.";
  if (!address.street.trim()) return "Enter the street.";
  if (!address.townCity.trim()) return "Enter the town or city.";
  const postcode = address.postcode.trim();
  if (!postcode) return "Enter the postcode.";
  if (!UK_POSTCODE_PATTERN.test(postcode))
    return "Enter a valid UK postcode, for example BS1 5AH.";

  const limits: Array<[string, string, number]> = [
    ["Flat / building", address.flatBuilding, 100],
    ["House number / name", address.houseNumberName, 100],
    ["Street", address.street, 120],
    ["Locality", address.locality, 100],
    ["Town / city", address.townCity, 100],
    ["County", address.county, 100],
    ["Postcode", address.postcode, 20],
  ];
  for (const [label, value, maximum] of limits)
    if (value.trim().length > maximum)
      return `${label} must be ${maximum} characters or fewer.`;

  return null;
}

function isStructuredAddress(value: unknown): value is StructuredAddress {
  if (!value || typeof value !== "object") return false;
  const address = value as Partial<StructuredAddress>;
  return (
    typeof address.flatBuilding === "string" &&
    typeof address.houseNumberName === "string" &&
    typeof address.street === "string" &&
    typeof address.locality === "string" &&
    typeof address.townCity === "string" &&
    typeof address.county === "string" &&
    typeof address.postcode === "string"
  );
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
    !isStructuredAddress(entry.address) ||
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

export function getAddressHistoryRequirement(
  permissions: readonly ImmigrationPermission[],
): AddressHistoryRequirement {
  const qualifying = permissions
    .filter(({ route }) => FIVE_YEAR_ROUTES.has(route))
    .sort((a, b) => a.permissionStartDate.localeCompare(b.permissionStartDate));
  if (qualifying.length === 0)
    return { requiredMonths: null, startMonth: null };

  const first = qualifying[0];
  return {
    requiredMonths: 60,
    startMonth: first ? first.permissionStartDate.slice(0, 7) : null,
  };
}

export function getRequiredAddressHistoryMonths(
  permissions: readonly ImmigrationPermission[],
): number | null {
  return getAddressHistoryRequirement(permissions).requiredMonths;
}

export function getLatestUncoveredAddressMonth(
  entries: readonly AddressHistoryEntry[],
  requiredStartMonth: string | null,
  asOfMonth: string,
): string | null {
  if (!requiredStartMonth) return null;
  if (!MONTH_PATTERN.test(requiredStartMonth) || !MONTH_PATTERN.test(asOfMonth))
    throw new Error("Address-history month is invalid.");

  const start = monthToIndex(requiredStartMonth);
  const end = monthToIndex(asOfMonth);
  if (start > end) return null;

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

  for (let month = end; month >= start; month -= 1) {
    if (!covered.has(month)) return indexToMonth(month);
  }
  return null;
}

export function getAddressHistoryMonthsRemaining(
  entries: readonly AddressHistoryEntry[],
  requiredStartMonth: string | null,
  asOfMonth: string,
): number | null {
  if (!requiredStartMonth) return null;
  if (!MONTH_PATTERN.test(requiredStartMonth) || !MONTH_PATTERN.test(asOfMonth))
    throw new Error("Address-history month is invalid.");

  const start = monthToIndex(requiredStartMonth);
  const end = monthToIndex(asOfMonth);
  if (start > end) return 0;

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

  let remaining = 0;
  for (let month = start; month <= end; month += 1)
    if (!covered.has(month)) remaining += 1;
  return remaining;
}

export function calculateAddressHistoryCoverage(
  entries: readonly AddressHistoryEntry[],
  requiredMonths: number | null,
  asOfMonth: string,
): AddressHistoryCoverage {
  if (requiredMonths === null)
    return {
      requiredMonths: null,
      coveredMonths: 0,
      complete: false,
      gaps: [],
    };
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
    if (closesGap && gapStart !== null) {
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

export function getPreviousCalendarMonth(month: string): string {
  if (!MONTH_PATTERN.test(month))
    throw new Error("Address-history month is invalid.");
  return indexToMonth(monthToIndex(month) - 1);
}
