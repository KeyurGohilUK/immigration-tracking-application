import { describe, expect, it } from "vitest";
import type { DocumentCategory, DocumentMetadata } from "./document";
import {
  calculateDocumentVaultProgress,
  getDefaultCategoryForSection,
} from "./document-vault";

const timestamp = "2026-09-01T12:00:00.000Z";

function documentFor(
  category: DocumentCategory,
  index: number,
): DocumentMetadata {
  return {
    version: 1,
    id: `document-${index}`,
    profileId: "owner",
    displayName: `Evidence ${index}`,
    fileName: `evidence-${index}.pdf`,
    mimeType: "application/pdf",
    size: 1024,
    category,
    sortOrder: index,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

describe("Document Vault readiness", () => {
  it("starts with genuine checklist states instead of document-count progress", () => {
    const progress = calculateDocumentVaultProgress([]);

    expect(progress.readinessPercent).toBe(0);
    expect(progress.totalRequired).toBe(6);
    expect(
      progress.sections.find(({ id }) => id === "identity-immigration")?.status,
    ).toBe("to-do");
    expect(
      progress.sections.find(({ id }) => id === "salary-tax")?.status,
    ).toBe("needs-attention");
    expect(
      progress.sections.find(({ id }) => id === "final-application")?.status,
    ).toBe("required-later");
  });

  it("marks Identity as partial until both core evidence items are present", () => {
    const passportOnly = calculateDocumentVaultProgress([
      documentFor("passport", 0),
    ]);
    expect(
      passportOnly.sections.find(({ id }) => id === "identity-immigration")
        ?.status,
    ).toBe("partial");

    const complete = calculateDocumentVaultProgress([
      documentFor("passport", 0),
      documentFor("immigration-evidence", 1),
    ]);
    expect(
      complete.sections.find(({ id }) => id === "identity-immigration")?.status,
    ).toBe("complete");
  });

  it("moves Address History from to-do to partial to complete from structured coverage", () => {
    const empty = calculateDocumentVaultProgress([]);
    expect(
      empty.sections.find(({ id }) => id === "address-history")?.status,
    ).toBe("to-do");

    const partial = calculateDocumentVaultProgress([], {
      addressHistoryEntryCount: 1,
      addressHistoryComplete: false,
    });
    expect(
      partial.sections.find(({ id }) => id === "address-history")?.status,
    ).toBe("partial");

    const complete = calculateDocumentVaultProgress([], {
      addressHistoryEntryCount: 3,
      addressHistoryComplete: true,
    });
    const completeAddress = complete.sections.find(
      ({ id }) => id === "address-history",
    );
    expect(completeAddress?.status).toBe("complete");
    expect(completeAddress?.completedRequired).toBe(1);
    expect(complete.readinessPercent).toBe(17);
  });

  it("marks Address History as needing attention without a current address", () => {
    const noCurrentAddress = calculateDocumentVaultProgress([], {
      addressHistoryEntryCount: 2,
      addressHistoryComplete: false,
      addressHistoryHasCurrentAddress: false,
    });
    expect(
      noCurrentAddress.sections.find(({ id }) => id === "address-history")
        ?.status,
    ).toBe("needs-attention");
  });

  it("keeps complete Address History complete when an address-proof file is unlinked", () => {
    const unlinkedProof = documentFor("address-proof", 0);
    const progress = calculateDocumentVaultProgress([unlinkedProof], {
      addressHistoryEntryCount: 3,
      addressHistoryComplete: true,
      addressHistoryHasCurrentAddress: true,
    });

    const addressSection = progress.sections.find(
      ({ id }) => id === "address-history",
    );
    expect(addressSection?.status).toBe("complete");
    expect(addressSection?.completedRequired).toBe(1);
  });

  it("does not make conditional or later evidence reduce readiness", () => {
    const progress = calculateDocumentVaultProgress([
      documentFor("life-in-uk", 0),
      documentFor("application-form", 1),
    ]);

    expect(progress.completedRequired).toBe(0);
    expect(progress.totalRequired).toBe(6);
    expect(progress.readinessPercent).toBe(0);
  });

  it("provides a sensible default upload category for every section", () => {
    expect(getDefaultCategoryForSection("identity-immigration")).toBe(
      "passport",
    );
    expect(getDefaultCategoryForSection("address-history")).toBe(
      "address-proof",
    );
    expect(getDefaultCategoryForSection("salary-tax")).toBe("payslip");
    expect(getDefaultCategoryForSection("additional")).toBe(
      "additional-document",
    );
    expect(getDefaultCategoryForSection("unknown-section")).toBeNull();
  });
});
