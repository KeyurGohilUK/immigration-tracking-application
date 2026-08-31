import { describe, expect, it } from "vitest";
import type { ImmigrationPermission } from "../../immigration/domain/immigration-permission";
import { calculateSkilledWorkerDependantQualifyingPeriod } from "./dependant-qualifying-period-calculation";

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
    role: "dependant",
    grantDate: start,
    permissionStartDate: start,
    permissionExpiryDate: expiry,
    actualUkArrivalDate: "",
    createdAt: "2026-08-31T00:00:00.000Z",
    updatedAt: "2026-08-31T00:00:00.000Z",
    ...overrides,
  };
}

describe("Skilled Worker dependant qualifying period", () => {
  it("shows the five-year and 28-day dates with a partner-linkage review", () => {
    const result = calculateSkilledWorkerDependantQualifyingPeriod(
      [permission("current", "2022-01-01", "2028-01-01")],
      "2026-08-31",
    );
    expect(result.qualifyingStartDate).toBe("2022-01-01");
    expect(result.qualifyingCompletionDate).toBe("2027-01-01");
    expect(result.earliestApplicationDate).toBe("2026-12-04");
    expect(result.status).toBe("manual-review");
    expect(result.issues).toContain("dependant-partner-linkage-not-verified");
  });

  it("joins consecutive eligible dependant grants", () => {
    const result = calculateSkilledWorkerDependantQualifyingPeriod(
      [
        permission("first", "2021-06-01", "2023-05-31"),
        permission("second", "2023-06-01", "2027-06-01"),
      ],
      "2026-08-31",
    );
    expect(result.qualifyingStartDate).toBe("2021-06-01");
    expect(result.relevantPermissionIds).toEqual(["first", "second"]);
  });

  it("flags a recorded gap instead of joining periods", () => {
    const result = calculateSkilledWorkerDependantQualifyingPeriod(
      [
        permission("first", "2021-01-01", "2022-01-01"),
        permission("second", "2022-02-01", "2028-01-01"),
      ],
      "2026-08-31",
    );
    expect(result.qualifyingStartDate).toBe("2022-02-01");
    expect(result.issues).toContain("gap-in-recorded-permission");
  });

  it("does not treat a main-applicant grant as dependant time", () => {
    const result = calculateSkilledWorkerDependantQualifyingPeriod(
      [
        permission("main", "2022-01-01", "2028-01-01", {
          role: "main-applicant",
        }),
      ],
      "2026-08-31",
    );
    expect(result.status).toBe("unsupported");
    expect(result.qualifyingStartDate).toBeNull();
  });
});
