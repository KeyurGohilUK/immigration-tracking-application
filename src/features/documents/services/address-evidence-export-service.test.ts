import { describe, expect, it } from "vitest";
import type { AddressHistoryEntry } from "../domain/address-history";
import type { DocumentMetadata } from "../domain/document";
import {
  buildAddressEvidenceExportPlan,
  getAddressHistoryIndexFileName,
} from "./address-evidence-export-service";

const timestamp = "2026-09-03T08:00:00.000Z";

function address(
  id: string,
  startMonth: string,
  endMonth: string,
  isCurrent: boolean,
  houseNumberName: string,
): AddressHistoryEntry {
  return {
    version: 1,
    id,
    profileId: "owner",
    address: {
      flatBuilding: "",
      houseNumberName,
      street: "Test Street",
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

function document(
  id: string,
  addressHistoryId: string,
  fileName: string,
  sortOrder: number,
): DocumentMetadata {
  return {
    version: 1,
    id,
    profileId: "owner",
    displayName: fileName,
    fileName,
    mimeType: "application/pdf",
    size: 100,
    category: "address-proof",
    addressHistoryId,
    sortOrder,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

describe("Address evidence export", () => {
  it("prefixes current and previous evidence using the visible address order", () => {
    const current = address("current", "2025-01", "", true, "20");
    const previousOne = address(
      "previous-1",
      "2024-01",
      "2024-12",
      false,
      "15",
    );
    const previousTwo = address(
      "previous-2",
      "2023-01",
      "2023-12",
      false,
      "10",
    );

    const plan = buildAddressEvidenceExportPlan(
      [previousTwo, current, previousOne],
      [
        document("d3", "previous-2", "bank.pdf", 3),
        document("d1", "current", "council-tax.pdf", 1),
        document("d2", "previous-1", "tenancy.pdf", 2),
      ],
    );

    expect(plan.evidenceFiles.map(({ exportedFileName }) => exportedFileName)).toEqual([
      "Current address - council-tax.pdf",
      "Previous address 1 - tenancy.pdf",
      "Previous address 2 - bank.pdf",
    ]);
    expect(plan.indexRows.map(({ addressLabel }) => addressLabel)).toEqual([
      "Current address",
      "Previous address 1",
      "Previous address 2",
    ]);
  });

  it("records month-year, full address and exported filenames in the index plan", () => {
    const plan = buildAddressEvidenceExportPlan(
      [address("current", "2025-01", "", true, "20")],
      [document("d1", "current", "council-tax.pdf", 1)],
    );

    expect(plan.indexRows[0]).toEqual({
      addressLabel: "Current address",
      from: "Jan 2025",
      to: "Present",
      fullAddress: "20 Test Street, Bristol, BS1 1AA",
      evidenceFileNames: ["Current address - council-tax.pdf"],
    });
  });

  it("shows addresses without evidence in the index", () => {
    const plan = buildAddressEvidenceExportPlan(
      [address("current", "2025-01", "", true, "20")],
      [],
    );

    expect(plan.indexRows[0]?.evidenceFileNames).toEqual([]);
    expect(plan.evidenceFiles).toEqual([]);
  });

  it("avoids filename collisions while retaining the original extension", () => {
    const current = address("current", "2025-01", "", true, "20");
    const plan = buildAddressEvidenceExportPlan(
      [current],
      [
        document("d1", "current", "bank.pdf", 1),
        document("d2", "current", "bank.pdf", 2),
      ],
    );

    expect(plan.evidenceFiles.map(({ exportedFileName }) => exportedFileName)).toEqual([
      "Current address - bank.pdf",
      "Current address - bank (2).pdf",
    ]);
  });

  it("uses a stable applicant-specific index filename", () => {
    expect(getAddressHistoryIndexFileName("Test User")).toBe(
      "Test-User-Address-History-Index.pdf",
    );
  });
});
