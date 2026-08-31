import type { ImmigrationPermission } from "../../immigration/domain/immigration-permission";
import {
  SKILLED_WORKER_QUALIFYING_PERIOD_RULE,
  isCurrentSkilledWorkerRoute,
  isSkilledWorkerQualifyingRoute,
} from "./qualifying-period-rule";

const DAY_IN_MILLISECONDS = 86_400_000;

export type QualifyingPeriodStatus =
  | "incomplete"
  | "manual-review"
  | "not-yet-complete"
  | "application-window-open"
  | "period-complete"
  | "unsupported";

export type QualifyingPeriodIssue =
  | "no-permission-history"
  | "latest-permission-not-supported"
  | "latest-permission-as-dependant"
  | "earlier-dependant-time-excluded"
  | "earlier-nonqualifying-time-excluded"
  | "gap-in-recorded-permission"
  | "permission-expired"
  | "permission-expires-before-estimated-date"
  | "missing-grant-date"
  | "pre-2018-permission"
  | "dependant-partner-linkage-not-verified";

export interface QualifyingPeriodResult {
  status: QualifyingPeriodStatus;
  qualifyingStartDate: string | null;
  qualifyingCompletionDate: string | null;
  earliestApplicationDate: string | null;
  issues: QualifyingPeriodIssue[];
  relevantPermissionIds: string[];
}

interface QualifyingPeriodInput {
  permissions: ImmigrationPermission[];
  asOfDate: string;
}

function parseDate(value: string): number {
  const timestamp = Date.parse(`${value}T00:00:00.000Z`);
  if (
    !Number.isFinite(timestamp) ||
    new Date(timestamp).toISOString().slice(0, 10) !== value
  )
    throw new TypeError("Date must be a valid YYYY-MM-DD calendar date.");
  return timestamp;
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toISOString().slice(0, 10);
}

function addDays(value: string, days: number): string {
  return formatDate(parseDate(value) + days * DAY_IN_MILLISECONDS);
}

function addCalendarYears(value: string, years: number): string {
  const date = new Date(parseDate(value));
  const year = date.getUTCFullYear() + years;
  const month = date.getUTCMonth();
  const day = date.getUTCDate();
  const lastDay = new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
  return formatDate(Date.UTC(year, month, Math.min(day, lastDay)));
}

function countingStart(permission: ImmigrationPermission): string {
  return permission.actualUkArrivalDate && permission.grantDate
    ? permission.grantDate
    : permission.permissionStartDate;
}

export function calculateSkilledWorkerQualifyingPeriod({
  permissions,
  asOfDate,
}: QualifyingPeriodInput): QualifyingPeriodResult {
  parseDate(asOfDate);
  const ordered = [...permissions].sort((left, right) =>
    countingStart(left).localeCompare(countingStart(right)),
  );
  const latest = ordered.at(-1);
  const emptyResult: QualifyingPeriodResult = {
    status: "incomplete",
    qualifyingStartDate: null,
    qualifyingCompletionDate: null,
    earliestApplicationDate: null,
    issues: ["no-permission-history"],
    relevantPermissionIds: [],
  };
  if (!latest) return emptyResult;
  if (latest.role !== SKILLED_WORKER_QUALIFYING_PERIOD_RULE.supportedRole) {
    return {
      ...emptyResult,
      status: "unsupported",
      issues: ["latest-permission-as-dependant"],
    };
  }
  if (!isCurrentSkilledWorkerRoute(latest.route)) {
    return {
      ...emptyResult,
      status: "unsupported",
      issues: ["latest-permission-not-supported"],
    };
  }

  const issues: QualifyingPeriodIssue[] = [];
  const relevant: ImmigrationPermission[] = [latest];
  let segmentStart = countingStart(latest);
  let coveredUntil = latest.permissionExpiryDate;
  let foundGap = false;

  for (let index = ordered.length - 2; index >= 0; index -= 1) {
    const permission = ordered[index];
    if (!permission) continue;
    const isQualifying =
      permission.role === SKILLED_WORKER_QUALIFYING_PERIOD_RULE.supportedRole &&
      isSkilledWorkerQualifyingRoute(permission.route);
    if (!isQualifying) {
      issues.push(
        permission.role === "dependant"
          ? "earlier-dependant-time-excluded"
          : "earlier-nonqualifying-time-excluded",
      );
      break;
    }
    const permissionEndPlusOne = addDays(permission.permissionExpiryDate, 1);
    if (permissionEndPlusOne < segmentStart) {
      foundGap = true;
      break;
    }
    relevant.unshift(permission);
    segmentStart = countingStart(permission);
    if (permission.permissionExpiryDate > coveredUntil)
      coveredUntil = permission.permissionExpiryDate;
  }

  if (foundGap) issues.push("gap-in-recorded-permission");
  if (relevant.some(({ grantDate }) => !grantDate))
    issues.push("missing-grant-date");
  if (relevant.some(({ grantDate }) => grantDate && grantDate < "2018-01-11"))
    issues.push("pre-2018-permission");

  const completion = addCalendarYears(
    segmentStart,
    SKILLED_WORKER_QUALIFYING_PERIOD_RULE.qualifyingYears,
  );
  const earliest = addDays(
    completion,
    -SKILLED_WORKER_QUALIFYING_PERIOD_RULE.earlyApplicationDays,
  );
  if (coveredUntil < asOfDate) issues.push("permission-expired");
  else if (coveredUntil < earliest)
    issues.push("permission-expires-before-estimated-date");

  let status: QualifyingPeriodStatus;
  if (
    issues.includes("gap-in-recorded-permission") ||
    issues.includes("pre-2018-permission")
  )
    status = "manual-review";
  else if (
    issues.includes("missing-grant-date") ||
    issues.includes("permission-expired")
  )
    status = "incomplete";
  else if (asOfDate >= completion) status = "period-complete";
  else if (asOfDate >= earliest) status = "application-window-open";
  else status = "not-yet-complete";

  return {
    status,
    qualifyingStartDate: segmentStart,
    qualifyingCompletionDate: completion,
    earliestApplicationDate: earliest,
    issues: [...new Set(issues)],
    relevantPermissionIds: relevant.map(({ id }) => id),
  };
}
