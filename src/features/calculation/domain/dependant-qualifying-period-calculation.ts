import type { ImmigrationPermission } from "../../immigration/domain/immigration-permission";
import type { QualifyingPeriodResult } from "./qualifying-period-calculation";
import {
  SKILLED_WORKER_DEPENDANT_PERIOD_RULE,
  isSkilledWorkerDependantRoute,
} from "./dependant-qualifying-period-rule";

const DAY = 86_400_000;

function timestamp(value: string): number {
  const result = Date.parse(`${value}T00:00:00.000Z`);
  if (!Number.isFinite(result)) throw new TypeError("Invalid calendar date.");
  return result;
}

function format(value: number): string {
  return new Date(value).toISOString().slice(0, 10);
}

function addDays(value: string, days: number): string {
  return format(timestamp(value) + days * DAY);
}

function addYears(value: string, years: number): string {
  const date = new Date(timestamp(value));
  const year = date.getUTCFullYear() + years;
  const month = date.getUTCMonth();
  const day = Math.min(
    date.getUTCDate(),
    new Date(Date.UTC(year, month + 1, 0)).getUTCDate(),
  );
  return format(Date.UTC(year, month, day));
}

function start(permission: ImmigrationPermission): string {
  return permission.actualUkArrivalDate && permission.grantDate
    ? permission.grantDate
    : permission.permissionStartDate;
}

export function calculateSkilledWorkerDependantQualifyingPeriod(
  permissions: ImmigrationPermission[],
  asOfDate: string,
): QualifyingPeriodResult {
  timestamp(asOfDate);
  const ordered = [...permissions].sort((a, b) =>
    start(a).localeCompare(start(b)),
  );
  const latest = ordered.at(-1);
  const empty: QualifyingPeriodResult = {
    status: "incomplete",
    qualifyingStartDate: null,
    qualifyingCompletionDate: null,
    earliestApplicationDate: null,
    issues: ["no-permission-history"],
    relevantPermissionIds: [],
  };
  if (!latest) return empty;
  if (
    latest.role !== "dependant" ||
    !isSkilledWorkerDependantRoute(latest.route)
  )
    return {
      ...empty,
      status: "unsupported",
      issues: ["latest-permission-not-supported"],
    };

  const relevant = [latest];
  const issues: QualifyingPeriodResult["issues"] = [
    "dependant-partner-linkage-not-verified",
  ];
  let periodStart = start(latest);
  let coveredUntil = latest.permissionExpiryDate;
  for (let index = ordered.length - 2; index >= 0; index -= 1) {
    const permission = ordered[index];
    if (!permission) continue;
    if (
      permission.role !== "dependant" ||
      !isSkilledWorkerDependantRoute(permission.route)
    ) {
      issues.push("earlier-nonqualifying-time-excluded");
      break;
    }
    if (addDays(permission.permissionExpiryDate, 1) < periodStart) {
      issues.push("gap-in-recorded-permission");
      break;
    }
    relevant.unshift(permission);
    periodStart = start(permission);
    if (permission.permissionExpiryDate > coveredUntil)
      coveredUntil = permission.permissionExpiryDate;
  }
  if (relevant.some(({ grantDate }) => !grantDate))
    issues.push("missing-grant-date");
  if (relevant.some(({ grantDate }) => grantDate && grantDate < "2018-01-11"))
    issues.push("pre-2018-permission");
  const completion = addYears(
    periodStart,
    SKILLED_WORKER_DEPENDANT_PERIOD_RULE.qualifyingYears,
  );
  const earliest = addDays(
    completion,
    -SKILLED_WORKER_DEPENDANT_PERIOD_RULE.earlyApplicationDays,
  );
  if (coveredUntil < asOfDate) issues.push("permission-expired");
  else if (coveredUntil < earliest)
    issues.push("permission-expires-before-estimated-date");

  const requiresManualReview = issues.some((issue) =>
    [
      "dependant-partner-linkage-not-verified",
      "gap-in-recorded-permission",
    ].includes(issue),
  );
  const incomplete = issues.some((issue) =>
    ["missing-grant-date", "permission-expired"].includes(issue),
  );
  const status = incomplete
    ? "incomplete"
    : requiresManualReview
      ? "manual-review"
      : asOfDate >= completion
        ? "period-complete"
        : asOfDate >= earliest
          ? "application-window-open"
          : "not-yet-complete";
  return {
    status,
    qualifyingStartDate: periodStart,
    qualifyingCompletionDate: completion,
    earliestApplicationDate: earliest,
    issues: [...new Set(issues)],
    relevantPermissionIds: relevant.map(({ id }) => id),
  };
}
