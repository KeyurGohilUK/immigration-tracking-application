import {
  getPermissionRouteLabel,
  type ImmigrationPermission,
} from "../../immigration/domain/immigration-permission";
import type { Trip } from "../../travel/domain/trip";
import { isSkilledWorkerDependantRoute } from "./dependant-qualifying-period-rule";
import { ABSENCE_RULE, isAbsenceRuleRoute } from "./absence-rule";
import { isSkilledWorkerQualifyingRoute } from "./qualifying-period-rule";

const DAY_IN_MILLISECONDS = 86_400_000;

export type AbsenceCheckStatus =
  | "incomplete"
  | "manual-review"
  | "potentially-over-limit"
  | "within-recorded-limit"
  | "unsupported";

export interface AbsenceWindow {
  startDate: string;
  endDate: string;
  daysOutside: number;
}

export interface AbsenceCheckResult {
  status: AbsenceCheckStatus;
  routeLabel: string | null;
  recordedTripCount: number;
  maximumRecordedDays: number;
  maximumWindow: AbsenceWindow | null;
  issues: Array<
    | "missing-grant-date"
    | "open-trip"
    | "potentially-permitted"
    | "pre-2018-record"
  >;
}

interface AbsenceCalculationInput {
  permissions: ImmigrationPermission[];
  trips: Trip[];
  asOfDate: string;
  applicationDate?: string;
}

interface ClassifiedAbsenceDays {
  rolling: number[];
  transitional: number[];
}

function parseDate(value: string): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) throw new TypeError("Date must use YYYY-MM-DD format.");
  const timestamp = Date.UTC(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
  );
  const parsed = new Date(timestamp);
  if (
    parsed.getUTCFullYear() !== Number(match[1]) ||
    parsed.getUTCMonth() !== Number(match[2]) - 1 ||
    parsed.getUTCDate() !== Number(match[3])
  )
    throw new RangeError("Date must be a valid calendar date.");
  return timestamp;
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toISOString().slice(0, 10);
}

function addCalendarYears(timestamp: number, years: number): number {
  const date = new Date(timestamp);
  const year = date.getUTCFullYear() + years;
  const month = date.getUTCMonth();
  const day = date.getUTCDate();
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return Date.UTC(year, month, Math.min(day, lastDay));
}

function addTwelveCalendarMonths(timestamp: number): number {
  return addCalendarYears(timestamp, 1);
}

function countingStart(permission: ImmigrationPermission): number {
  return parseDate(
    permission.actualUkArrivalDate && permission.grantDate
      ? permission.grantDate
      : permission.permissionStartDate,
  );
}

function permissionForDay(
  day: number,
  permissions: ImmigrationPermission[],
): ImmigrationPermission | null {
  return (
    [...permissions]
      .sort((left, right) =>
        right.permissionStartDate.localeCompare(left.permissionStartDate),
      )
      .find(
        (permission) =>
          day >= countingStart(permission) &&
          day <= parseDate(permission.permissionExpiryDate),
      ) ?? null
  );
}

function isTransitionalPermission(
  permission: ImmigrationPermission | null,
): boolean {
  return Boolean(
    permission?.grantDate &&
      permission.grantDate < ABSENCE_RULE.effectiveFrom,
  );
}

function collectWholeAbsenceDays(
  trips: Trip[],
  permissions: ImmigrationPermission[],
  asOfDate: string,
): ClassifiedAbsenceDays {
  const asOf = parseDate(asOfDate);
  const classified = new Map<number, "rolling" | "transitional">();

  const classify = (day: number, permission?: ImmigrationPermission): void => {
    const activePermission = permission ?? permissionForDay(day, permissions);
    classified.set(
      day,
      isTransitionalPermission(activePermission)
        ? "transitional"
        : "rolling",
    );
  };

  for (const trip of trips) {
    const departure = parseDate(trip.departureDate);
    const returned = trip.returnDate ? parseDate(trip.returnDate) : asOf;
    for (
      let day = departure + DAY_IN_MILLISECONDS;
      day < returned;
      day += DAY_IN_MILLISECONDS
    )
      classify(day);
  }

  for (const permission of permissions) {
    if (!permission.actualUkArrivalDate || !permission.grantDate) continue;
    const granted = parseDate(permission.grantDate);
    const arrived = parseDate(permission.actualUkArrivalDate);
    for (
      let day = granted;
      day < arrived && day <= asOf;
      day += DAY_IN_MILLISECONDS
    )
      classify(day, permission);
  }

  const rolling: number[] = [];
  const transitional: number[] = [];
  for (const [day, method] of classified) {
    (method === "transitional" ? transitional : rolling).push(day);
  }
  rolling.sort((left, right) => left - right);
  transitional.sort((left, right) => left - right);
  return { rolling, transitional };
}

function findMaximumRollingWindow(absenceDays: number[]): AbsenceWindow | null {
  const firstAbsenceDay = absenceDays[0];
  if (firstAbsenceDay === undefined) return null;
  let maximumStart = firstAbsenceDay;
  let maximumEnd = addTwelveCalendarMonths(maximumStart);
  let maximumDays = 0;
  let right = 0;
  for (let left = 0; left < absenceDays.length; left += 1) {
    const windowStart = absenceDays[left];
    if (windowStart === undefined) break;
    if (right < left) right = left;
    const endExclusive = addTwelveCalendarMonths(windowStart);
    while (
      absenceDays[right] !== undefined &&
      (absenceDays[right] as number) < endExclusive
    )
      right += 1;
    const daysOutside = right - left;
    if (daysOutside > maximumDays) {
      maximumDays = daysOutside;
      maximumStart = windowStart;
      maximumEnd = endExclusive;
    }
  }
  return {
    startDate: formatDate(maximumStart),
    endDate: formatDate(maximumEnd - DAY_IN_MILLISECONDS),
    daysOutside: maximumDays,
  };
}

function findMaximumApplicationAnchoredWindow(
  absenceDays: number[],
  applicationDate: string,
): AbsenceWindow | null {
  const firstAbsenceDay = absenceDays[0];
  if (firstAbsenceDay === undefined) return null;

  let end = parseDate(applicationDate);
  let maximum: AbsenceWindow | null = null;

  while (end >= firstAbsenceDay) {
    const previousEnd = addCalendarYears(end, -1);
    const start = previousEnd + DAY_IN_MILLISECONDS;
    const daysOutside = absenceDays.filter(
      (day) => day >= start && day <= end,
    ).length;
    if (!maximum || daysOutside > maximum.daysOutside) {
      maximum = {
        startDate: formatDate(start),
        endDate: formatDate(end),
        daysOutside,
      };
    }
    end = previousEnd;
  }

  return maximum;
}

function largerWindow(
  left: AbsenceWindow | null,
  right: AbsenceWindow | null,
): AbsenceWindow | null {
  if (!left) return right;
  if (!right) return left;
  return right.daysOutside > left.daysOutside ? right : left;
}

function calculateAbsenceForRole(
  { permissions, trips, asOfDate, applicationDate }: AbsenceCalculationInput,
  supportedRole: "main-applicant" | "dependant",
): AbsenceCheckResult {
  parseDate(asOfDate);
  if (applicationDate) parseDate(applicationDate);
  const qualifyingPermissions = permissions
    .filter(
      ({ route, role }) =>
        role === supportedRole &&
        (supportedRole === "dependant"
          ? isSkilledWorkerDependantRoute(route)
          : isSkilledWorkerQualifyingRoute(route)),
    )
    .sort((left, right) =>
      right.permissionStartDate.localeCompare(left.permissionStartDate),
    );
  const latestPermission = permissions
    .filter(
      ({ route, role }) => role === supportedRole && isAbsenceRuleRoute(route),
    )
    .sort((left, right) =>
      right.permissionStartDate.localeCompare(left.permissionStartDate),
    )[0];
  const routeLabel = latestPermission
    ? getPermissionRouteLabel(latestPermission)
    : null;
  const absenceDays = collectWholeAbsenceDays(
    trips,
    qualifyingPermissions,
    asOfDate,
  );
  const rollingWindow = findMaximumRollingWindow(absenceDays.rolling);
  const transitionalWindow = findMaximumApplicationAnchoredWindow(
    absenceDays.transitional,
    applicationDate ?? asOfDate,
  );
  const maximumWindow = largerWindow(rollingWindow, transitionalWindow);
  const maximumRecordedDays = maximumWindow?.daysOutside ?? 0;
  const issues: AbsenceCheckResult["issues"] = [];
  if (trips.some(({ returnDate }) => !returnDate)) issues.push("open-trip");
  if (qualifyingPermissions.some(({ grantDate }) => !grantDate))
    issues.push("missing-grant-date");
  if (trips.some(({ exceptionalAbsence }) => exceptionalAbsence))
    issues.push("potentially-permitted");
  if (
    qualifyingPermissions.some(
      ({ grantDate }) => grantDate && grantDate < ABSENCE_RULE.effectiveFrom,
    )
  )
    issues.push("pre-2018-record");

  let status: AbsenceCheckStatus;
  if (permissions.length === 0) status = "incomplete";
  else if (!latestPermission) status = "unsupported";
  else if (issues.includes("potentially-permitted")) status = "manual-review";
  else if (
    issues.includes("missing-grant-date") ||
    issues.includes("open-trip")
  )
    status = "incomplete";
  else if (maximumRecordedDays > ABSENCE_RULE.maximumDays)
    status = "potentially-over-limit";
  else status = "within-recorded-limit";

  return {
    status,
    routeLabel,
    recordedTripCount: trips.length,
    maximumRecordedDays,
    maximumWindow,
    issues,
  };
}

export function calculateRecordedAbsenceCheck(
  input: AbsenceCalculationInput,
): AbsenceCheckResult {
  return calculateAbsenceForRole(input, "main-applicant");
}

export function calculateRecordedDependantAbsenceCheck(
  input: AbsenceCalculationInput,
): AbsenceCheckResult {
  return calculateAbsenceForRole(input, "dependant");
}
