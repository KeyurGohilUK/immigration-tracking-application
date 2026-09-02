import { describe, expect, it } from "vitest";
import {
  calculateAddressHistoryCoverage,
  getAddressHistoryRequirement,
  getNextUncoveredAddressMonth,
  getRequiredAddressHistoryMonths,
  validateAddressHistoryCollection,
  validateAddressHistoryInput,
  type AddressHistoryEntry,
} from "./address-history";

const timestamp = "2026-09-01T12:00:00.000Z";

function entry(
  id: string,
  startMonth: string,
  endMonth: string,
  isCurrent = false,
): AddressHistoryEntry {
  return {
    version: 1,
    id,
    profileId: "owner",
    fullAddress: `${id} Example Street, Bristol, BS1 1AA`,
    startMonth,
    endMonth,
    isCurrent,
    notes: "",
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function permission(
  route: "skilled-worker" | "global-talent",
  permissionStartDate = "2024-01-01",
) {
  return {
    version: 2 as const,
    id: `permission-${route}`,
    profileId: "owner",
    route,
    otherRouteName: "",
    role: "main-applicant" as const,
    grantDate: permissionStartDate,
    permissionStartDate,
    permissionExpiryDate: "2029-01-01",
    actualUkArrivalDate: "2024-01-01",
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

describe("address history", () => {
  it("requires complete month ranges for previous addresses", () => {
    expect(
      validateAddressHistoryInput({
        fullAddress: "1 Example Street, Bristol",
        startMonth: "2023-01",
        endMonth: "",
        isCurrent: false,
        notes: "",
      }),
    ).toContain("end month");
  });

  it("rejects overlapping address periods", () => {
    expect(
      validateAddressHistoryCollection([
        entry("one", "2024-01", "2025-06"),
        entry("two", "2025-06", "", true),
      ]),
    ).toContain("overlap");
  });

  it("finds gaps across a five-year history", () => {
    const result = calculateAddressHistoryCoverage(
      [entry("one", "2021-09", "2023-12"), entry("two", "2024-02", "", true)],
      60,
      "2026-09",
    );
    expect(result.complete).toBe(false);
    expect(result.gaps).toContain("2024-01");
  });

  it("marks five continuous years as complete", () => {
    const result = calculateAddressHistoryCoverage(
      [entry("one", "2021-09", "", true)],
      60,
      "2026-09",
    );
    expect(result.complete).toBe(true);
    expect(result.coveredMonths).toBe(60);
  });

  it("uses a route rule instead of a global five-year constant", () => {
    const skilledWorker = permission("skilled-worker");
    const unsupported = permission("global-talent");
    expect(getRequiredAddressHistoryMonths([skilledWorker])).toBe(60);
    expect(getRequiredAddressHistoryMonths([unsupported])).toBeNull();
  });

  it("starts the guided timeline from the earliest qualifying permission", () => {
    const requirement = getAddressHistoryRequirement([
      permission("skilled-worker", "2023-07-15"),
      permission("skilled-worker", "2021-09-01"),
    ]);
    expect(requirement).toEqual({
      requiredMonths: 60,
      startMonth: "2021-09",
    });
  });

  it("prefills the first uncovered month after a saved address", () => {
    expect(
      getNextUncoveredAddressMonth(
        [entry("one", "2021-09", "2023-06")],
        "2021-09",
        "2026-09",
      ),
    ).toBe("2023-07");
  });

  it("returns no next month once the recorded timeline reaches present", () => {
    expect(
      getNextUncoveredAddressMonth(
        [entry("one", "2021-09", "2023-06"), entry("two", "2023-07", "", true)],
        "2021-09",
        "2026-09",
      ),
    ).toBeNull();
  });
});
