import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import type { DecryptedDocumentFile } from "../data/document-repository";
import type { AddressHistoryEntry } from "../domain/address-history";
import type { DocumentMetadata } from "../domain/document";
import {
  buildAddressEvidenceIndexRows,
  createAddressEvidencePack,
  getAddressEvidencePackFileName,
} from "./address-evidence-pack-service";

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

function metadata(
  id: string,
  addressHistoryId: string,
  displayName: string,
  sortOrder: number,
): DocumentMetadata {
  return {
    version: 1,
    id,
    profileId: "owner",
    displayName,
    fileName: `${id}.pdf`,
    mimeType: "application/pdf",
    size: 100,
    category: "address-proof",
    addressHistoryId,
    sortOrder,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

async function pdfFile(
  documentMetadata: DocumentMetadata,
  pageCount: number,
): Promise<DecryptedDocumentFile> {
  const pdf = await PDFDocument.create();
  for (let index = 0; index < pageCount; index += 1) pdf.addPage();
  const saved = await pdf.save();
  const bytes = new Uint8Array(saved.byteLength);
  bytes.set(saved);
  return {
    metadata: {
      ...documentMetadata,
      size: bytes.byteLength,
    },
    bytes,
  };
}

describe("Address History evidence PDF", () => {
  it("orders addresses chronologically and calculates final evidence page ranges", () => {
    const current = address("current", "2025-01", "", true, "20");
    const previous = address("previous", "2023-06", "2024-12", false, "10");
    const rows = buildAddressEvidenceIndexRows(
      [current, previous],
      [
        {
          metadata: metadata("current-proof", "current", "Current proof", 2),
          pageCount: 1,
        },
        {
          metadata: metadata("previous-proof", "previous", "Previous proof", 1),
          pageCount: 2,
        },
      ],
      1,
    );

    expect(rows).toEqual([
      expect.objectContaining({
        addressNumber: 1,
        from: "Jun 2023",
        to: "Dec 2024",
        fullAddress: "10 Test Street, Bristol, BS1 1AA",
        supportingDocument: "Previous proof",
        pages: "2-3",
        documentId: "previous-proof",
      }),
      expect.objectContaining({
        addressNumber: 2,
        from: "Jan 2025",
        to: "Present",
        fullAddress: "20 Test Street, Bristol, BS1 1AA",
        supportingDocument: "Current proof",
        pages: "4",
        documentId: "current-proof",
      }),
    ]);
  });

  it("shows addresses with missing evidence in the index without assigning pages", () => {
    const rows = buildAddressEvidenceIndexRows(
      [address("current", "2025-01", "", true, "20")],
      [],
      1,
    );

    expect(rows[0]).toMatchObject({
      addressNumber: 1,
      supportingDocument: "No evidence attached",
      pages: "-",
    });
    expect(rows[0]?.documentId).toBeUndefined();
  });

  it("creates an index-first PDF followed by every linked evidence page", async () => {
    const previous = address("previous", "2023-06", "2024-12", false, "10");
    const current = address("current", "2025-01", "", true, "20");
    const previousFile = await pdfFile(
      metadata("previous-proof", "previous", "Previous proof", 0),
      2,
    );
    const currentFile = await pdfFile(
      metadata("current-proof", "current", "Current proof", 1),
      1,
    );

    const bytes = await createAddressEvidencePack(
      [current, previous],
      [currentFile, previousFile],
      "Test User",
    );
    const output = await PDFDocument.load(bytes);

    expect(output.getPageCount()).toBe(4);
  });

  it("creates a stable applicant-specific filename", () => {
    expect(getAddressEvidencePackFileName("Test User")).toBe(
      "Test-User-Address-History-Evidence.pdf",
    );
  });
});
