import { describe, expect, it } from "vitest";
import {
  calculateAddressHistoryCoverage,
  getRequiredAddressHistoryMonths,
  validateAddressHistoryCollection,
  validateAddressHistoryInput,
  type AddressHistoryEntry,
} from "./address-history";
import type { ImmigrationPermission } from "../../immigration/domain/immigration-permission";

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
      [
        entry("one", "2021-09", "2023-12"),
        entry("two", "2024-02", "", true),
      ],
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
    const skilledWorker = {
      route: "skilled-worker",
      permissionStartDate: "2024-01-01",
    } as ImmigrationPermission;
    const unsupported = {
      route: "global-talent",
      permissionStartDate: "2024-01-01",
    } as ImmigrationPermission;
    expect(getRequiredAddressHistoryMonths([skilledWorker])).toBe(60);
    expect(getRequiredAddressHistoryMonths([unsupported])).toBeNull();
  });
});
