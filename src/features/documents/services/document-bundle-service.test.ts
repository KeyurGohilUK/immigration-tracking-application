import { describe, expect, it } from "vitest";
import type { DecryptedDocumentFile } from "../data/document-repository";
import type { AddressHistoryEntry } from "../domain/address-history";
import type { DocumentMetadata } from "../domain/document";
import {
  buildDocumentBundlePlan,
  createDocumentBundle,
  createHouseholdDocumentBundle,
  getDocumentBundleFileName,
  getHouseholdDocumentBundleFileName,
} from "./document-bundle-service";

const timestamp = "2026-09-03T09:00:00.000Z";

function documentFile(
  id: string,
  category: DocumentMetadata["category"],
  fileName: string,
  addressHistoryId?: string,
): DecryptedDocumentFile {
  const bytes = new Uint8Array([1, 2, 3]);
  return {
    metadata: {
      version: 1,
      id,
      profileId: "owner",
      displayName: fileName,
      fileName,
      mimeType: "application/pdf",
      size: bytes.byteLength,
      category,
      addressHistoryId,
      sortOrder: Number(id.replace(/\D/g, "")) || 0,
      createdAt: timestamp,
      updatedAt: timestamp,
    },
    bytes,
  };
}

function address(
  id: string,
  startMonth: string,
  endMonth: string,
  isCurrent: boolean,
): AddressHistoryEntry {
  return {
    version: 1,
    id,
    profileId: "owner",
    address: {
      flatBuilding: "",
      houseNumberName: "10",
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

describe("Document Vault ZIP bundle", () => {
  it("creates a folder for every visible Document Vault section", () => {
    const plan = buildDocumentBundlePlan([], [], "Test User");

    expect(plan.folders).toEqual([
      "Address History",
      "Employment",
      "Salary & Tax",
      "Travel & Absences",
      "Life in the UK & English",
      "Family & Dependants",
      "Final Application Documents",
      "Additional Documents",
    ]);
  });

  it("places normal documents into their matching section folders", () => {
    const plan = buildDocumentBundlePlan(
      [
        documentFile("1", "employer-letter", "employer-letter.pdf"),
        documentFile("2", "payslip", "payslip.pdf"),
        documentFile("3", "travel-evidence", "flight.pdf"),
      ],
      [],
      "Test User",
    );

    expect(plan.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          path: "Employment/employer-letter.pdf",
          documentId: "1",
        }),
        expect.objectContaining({
          path: "Salary & Tax/payslip.pdf",
          documentId: "2",
        }),
        expect.objectContaining({
          path: "Travel & Absences/flight.pdf",
          documentId: "3",
        }),
      ]),
    );
  });

  it("uses Address History index and Current/Previous prefixes inside the Address folder", () => {
    const current = address("current", "2025-01", "", true);
    const previous = address("previous", "2023-01", "2024-12", false);
    const plan = buildDocumentBundlePlan(
      [
        documentFile("1", "address-proof", "council-tax.pdf", "current"),
        documentFile("2", "address-proof", "tenancy.pdf", "previous"),
      ],
      [previous, current],
      "Test User",
    );

    expect(plan.items).toEqual(
      expect.arrayContaining([
        {
          path: "Address History/Test-User-Address-History-Index.pdf",
          generated: "address-index",
        },
        expect.objectContaining({
          path: "Address History/Current address - council-tax.pdf",
        }),
        expect.objectContaining({
          path: "Address History/Previous address 1 - tenancy.pdf",
        }),
      ]),
    );
  });

  it("keeps unlinked address evidence in the Address History folder", () => {
    const plan = buildDocumentBundlePlan(
      [documentFile("1", "address-proof", "bank.pdf")],
      [],
      "Test User",
    );

    expect(plan.items[0]).toMatchObject({
      path: "Address History/Unlinked address evidence - bank.pdf",
      documentId: "1",
    });
  });

  it("creates a valid ZIP shell containing section folder and file names", async () => {
    const bytes = await createDocumentBundle(
      [documentFile("1", "employment-contract", "contract.pdf")],
      [],
      "Test User",
    );

    expect(new DataView(bytes.buffer).getUint32(0, true)).toBe(0x04034b50);
    const text = new TextDecoder().decode(bytes);
    expect(text).toContain("Employment/");
    expect(text).toContain("Employment/contract.pdf");
    expect(
      new DataView(bytes.buffer).getUint32(bytes.byteLength - 22, true),
    ).toBe(0x06054b50);
  });

  it("creates a combined household ZIP with isolated member folders", async () => {
    const ownerFile = documentFile(
      "1",
      "employment-contract",
      "owner-contract.pdf",
    );
    const dependantFile = {
      ...documentFile("2", "payslip", "dependant-payslip.pdf"),
      metadata: {
        ...documentFile("2", "payslip", "dependant-payslip.pdf").metadata,
        profileId: "dependant",
      },
    };
    const bytes = await createHouseholdDocumentBundle([
      {
        profileId: "owner",
        profileName: "Test User",
        documents: [ownerFile],
        addresses: [],
      },
      {
        profileId: "dependant",
        profileName: "Family Member",
        documents: [dependantFile],
        addresses: [],
      },
    ]);

    const text = new TextDecoder().decode(bytes);
    expect(text).toContain("Test User/Employment/owner-contract.pdf");
    expect(text).toContain("Family Member/Salary & Tax/dependant-payslip.pdf");
  });

  it("keeps duplicate household names in separate folders", async () => {
    const bytes = await createHouseholdDocumentBundle([
      {
        profileId: "one",
        profileName: "Same Name",
        documents: [],
        addresses: [],
      },
      {
        profileId: "two",
        profileName: "Same Name",
        documents: [],
        addresses: [],
      },
    ]);

    const text = new TextDecoder().decode(bytes);
    expect(text).toContain("Same Name/");
    expect(text).toContain("Same Name (2)/");
  });

  it("uses a stable household ZIP filename", () => {
    expect(getHouseholdDocumentBundleFileName()).toBe(
      "UrbanFox-Household-ILR-Document-Bundle.zip",
    );
  });

  it("uses an applicant-specific ZIP filename", () => {
    expect(getDocumentBundleFileName("Test User")).toBe(
      "Test-User-ILR-Document-Bundle.zip",
    );
  });
});
