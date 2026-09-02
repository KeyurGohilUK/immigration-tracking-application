import { describe, expect, it } from "vitest";
import {
  calculateAddressHistoryCoverage,
  getAddressHistoryMonthsRemaining,
  getAddressHistoryRequirement,
  getLatestUncoveredAddressMonth,
  getPreviousCalendarMonth,
  getRequiredAddressHistoryMonths,
  validateAddressHistoryCollection,
  formatStructuredAddress,
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
    address: {
      flatBuilding: "",
      houseNumberName: id,
      street: "Example Street",
      locality: "",
      townCity: "Bristol",
      county: "",
      postcode: "BS1 1AA",
    },
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
        address: {
          flatBuilding: "",
          houseNumberName: "1",
          street: "Example Street",
          locality: "",
          townCity: "Bristol",
          county: "",
          postcode: "BS1 1AA",
        },
        startMonth: "2023-01",
        endMonth: "",
        isCurrent: false,
        notes: "",
      }),
    ).toContain("end month");
  });

  it("formats structured UK addresses without empty optional parts", () => {
    expect(
      formatStructuredAddress({
        flatBuilding: "Flat 4",
        houseNumberName: "27",
        street: "Blackhorse Lane",
        locality: "",
        townCity: "Bristol",
        county: "",
        postcode: "bs16 3xx",
      }),
    ).toBe("Flat 4, 27 Blackhorse Lane, Bristol, BS16 3XX");
  });

  it("rejects an invalid UK postcode", () => {
    expect(
      validateAddressHistoryInput({
        address: {
          flatBuilding: "",
          houseNumberName: "1",
          street: "Example Street",
          locality: "",
          townCity: "Bristol",
          county: "",
          postcode: "NOT A POSTCODE",
        },
        startMonth: "2025-01",
        endMonth: "",
        isCurrent: true,
        notes: "",
      }),
    ).toContain("valid UK postcode");
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
      "2021-10",
      "2026-09",
    );
    expect(result.complete).toBe(false);
    expect(result.gaps).toContain("2024-01");
  });

  it("marks five continuous years as complete", () => {
    const result = calculateAddressHistoryCoverage(
      [entry("one", "2021-09", "", true)],
      60,
      "2021-10",
      "2026-09",
    );
    expect(result.complete).toBe(true);
    expect(result.coveredMonths).toBe(60);
  });

  it("does not create gaps before the qualifying permission start", () => {
    const result = calculateAddressHistoryCoverage(
      [
        entry("previous", "2023-06", "2024-10"),
        entry("current", "2024-11", "", true),
      ],
      60,
      "2023-06",
      "2026-09",
    );

    expect(result).toEqual({
      requiredMonths: 60,
      coveredMonths: 40,
      complete: true,
      gaps: [],
    });
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

  it("finds the latest uncovered month when working backwards", () => {
    expect(
      getLatestUncoveredAddressMonth(
        [entry("current", "2025-01", "", true)],
        "2021-09",
        "2026-09",
      ),
    ).toBe("2024-12");
  });

  it("moves the previous-address boundary backwards after each saved address", () => {
    expect(
      getLatestUncoveredAddressMonth(
        [
          entry("previous", "2023-07", "2024-12"),
          entry("current", "2025-01", "", true),
        ],
        "2021-09",
        "2026-09",
      ),
    ).toBe("2023-06");
  });

  it("returns no uncovered month once history reaches the required start", () => {
    expect(
      getLatestUncoveredAddressMonth(
        [
          entry("oldest", "2021-09", "2023-06"),
          entry("previous", "2023-07", "2024-12"),
          entry("current", "2025-01", "", true),
        ],
        "2021-09",
        "2026-09",
      ),
    ).toBeNull();
  });

  it("calculates the previous calendar month for a move-home transition", () => {
    expect(getPreviousCalendarMonth("2026-09")).toBe("2026-08");
    expect(getPreviousCalendarMonth("2026-01")).toBe("2025-12");
  });

  it("reports how many required months remain uncovered", () => {
    expect(
      getAddressHistoryMonthsRemaining(
        [entry("current", "2025-01", "", true)],
        "2021-09",
        "2026-09",
      ),
    ).toBe(40);
  });
});
