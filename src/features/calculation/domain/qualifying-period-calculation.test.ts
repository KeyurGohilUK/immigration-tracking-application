import { describe, expect, it } from "vitest";
import type { ImmigrationPermission } from "../../immigration/domain/immigration-permission";
import { calculateSkilledWorkerQualifyingPeriod } from "./qualifying-period-calculation";

function permission(
  id: string,
  start: string,
  expiry: string,
  overrides: Partial<ImmigrationPermission> = {},
): ImmigrationPermission {
  return {
    version: 2,
    id,
    profileId: "owner",
    route: "skilled-worker",
    otherRouteName: "",
    role: "main-applicant",
    grantDate: start,
    permissionStartDate: start,
    permissionExpiryDate: expiry,
    actualUkArrivalDate: "",
    createdAt: "2026-08-30T00:00:00.000Z",
    updatedAt: "2026-08-30T00:00:00.000Z",
    ...overrides,
  };
}

describe("Skilled Worker qualifying period", () => {
  it("calculates five calendar years and the 28-day application estimate", () => {
    const result = calculateSkilledWorkerQualifyingPeriod({
      permissions: [permission("current", "2022-01-01", "2028-01-01")],
      asOfDate: "2026-08-30",
    });

    expect(result.status).toBe("not-yet-complete");
    expect(result.qualifyingStartDate).toBe("2022-01-01");
    expect(result.qualifyingCompletionDate).toBe("2027-01-01");
    expect(result.earliestApplicationDate).toBe("2026-12-04");
  });

  it("reports the early window separately from the completed period", () => {
    const permissions = [permission("current", "2022-01-01", "2028-01-01")];
    expect(
      calculateSkilledWorkerQualifyingPeriod({
        permissions,
        asOfDate: "2026-12-04",
      }).status,
    ).toBe("application-window-open");
    expect(
      calculateSkilledWorkerQualifyingPeriod({
        permissions,
        asOfDate: "2027-01-01",
      }).status,
    ).toBe("period-complete");
  });

  it("combines consecutive permission on every route listed in SW 21.2", () => {
    const result = calculateSkilledWorkerQualifyingPeriod({
      permissions: [
        permission("global", "2021-10-01", "2023-09-30", {
          route: "global-talent",
        }),
        permission("scale", "2023-10-01", "2024-09-30", {
          route: "scale-up",
        }),
        permission("current", "2024-10-01", "2027-10-01", {
          route: "health-and-care-worker",
        }),
      ],
      asOfDate: "2026-08-30",
    });

    expect(result.qualifyingStartDate).toBe("2021-10-01");
    expect(result.relevantPermissionIds).toEqual([
      "global",
      "scale",
      "current",
    ]);
    expect(result.earliestApplicationDate).toBe("2026-09-03");
  });

  it("excludes dependant time from a main-applicant period", () => {
    const result = calculateSkilledWorkerQualifyingPeriod({
      permissions: [
        permission("dependant", "2020-01-01", "2021-12-31", {
          role: "dependant",
        }),
        permission("current", "2022-01-01", "2028-01-01"),
      ],
      asOfDate: "2026-08-30",
    });

    expect(result.qualifyingStartDate).toBe("2022-01-01");
    expect(result.issues).toContain("earlier-dependant-time-excluded");
    expect(result.relevantPermissionIds).toEqual(["current"]);
  });

  it("detects a recorded gap and requires manual review", () => {
    const result = calculateSkilledWorkerQualifyingPeriod({
      permissions: [
        permission("first", "2021-01-01", "2023-01-01"),
        permission("current", "2023-02-01", "2028-01-01"),
      ],
      asOfDate: "2026-08-30",
    });

    expect(result.status).toBe("manual-review");
    expect(result.issues).toContain("gap-in-recorded-permission");
    expect(result.qualifyingStartDate).toBe("2023-02-01");
  });

  it("supports qualifying route changes without breaking the recorded period", () => {
    const result = calculateSkilledWorkerQualifyingPeriod({
      permissions: [
        permission("tier-1", "2021-01-01", "2022-12-31", {
          route: "tier-1",
        }),
        permission("global", "2023-01-01", "2024-12-31", {
          route: "global-talent",
        }),
        permission("current", "2025-01-01", "2028-01-01"),
      ],
      asOfDate: "2026-09-04",
    });
    expect(result.qualifyingStartDate).toBe("2021-01-01");
    expect(result.relevantPermissionIds).toEqual([
      "tier-1",
      "global",
      "current",
    ]);
    expect(result.issues).not.toContain("gap-in-recorded-permission");
  });

  it("uses an entry-clearance grant as the start and handles leap-day anniversaries", () => {
    const entry = calculateSkilledWorkerQualifyingPeriod({
      permissions: [
        permission("entry", "2022-01-01", "2028-01-01", {
          grantDate: "2021-12-15",
          actualUkArrivalDate: "2022-01-15",
        }),
      ],
      asOfDate: "2026-08-30",
    });
    const leap = calculateSkilledWorkerQualifyingPeriod({
      permissions: [permission("leap", "2024-02-29", "2030-03-01")],
      asOfDate: "2026-08-30",
    });

    expect(entry.qualifyingStartDate).toBe("2021-12-15");
    expect(entry.qualifyingCompletionDate).toBe("2026-12-15");
    expect(leap.qualifyingCompletionDate).toBe("2029-02-28");
  });

  it("does not support a dependant or non-Skilled-Worker current route", () => {
    expect(
      calculateSkilledWorkerQualifyingPeriod({
        permissions: [
          permission("dependant", "2022-01-01", "2028-01-01", {
            role: "dependant",
          }),
        ],
        asOfDate: "2026-08-30",
      }).status,
    ).toBe("unsupported");
    expect(
      calculateSkilledWorkerQualifyingPeriod({
        permissions: [
          permission("global", "2022-01-01", "2028-01-01", {
            route: "global-talent",
          }),
        ],
        asOfDate: "2026-08-30",
      }).issues,
    ).toContain("latest-permission-not-supported");
  });

  it("flags missing, expired, and pre-2018 permission data", () => {
    const missing = calculateSkilledWorkerQualifyingPeriod({
      permissions: [
        permission("current", "2022-01-01", "2028-01-01", {
          grantDate: "",
        }),
      ],
      asOfDate: "2026-08-30",
    });
    const expired = calculateSkilledWorkerQualifyingPeriod({
      permissions: [permission("expired", "2020-01-01", "2025-01-01")],
      asOfDate: "2026-08-30",
    });
    const transitional = calculateSkilledWorkerQualifyingPeriod({
      permissions: [permission("old", "2017-01-01", "2028-01-01")],
      asOfDate: "2020-01-01",
    });

    expect(missing.status).toBe("incomplete");
    expect(expired.issues).toContain("permission-expired");
    expect(transitional.status).toBe("not-yet-complete");
    expect(transitional.issues).toContain("pre-2018-permission");
  });
});
