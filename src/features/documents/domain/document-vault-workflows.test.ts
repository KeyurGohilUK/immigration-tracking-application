import { describe, expect, it } from "vitest";
import type { HouseholdMember } from "../../household/domain/household-member";
import type { ImmigrationPermission } from "../../immigration/domain/immigration-permission";
import type { DocumentMetadata } from "./document";
import { calculateDocumentVaultProgress } from "./document-vault";
import { getRouteDrivenNotApplicableRequirementIds } from "./document-requirement-rules";

const timestamp = "2026-09-08T12:00:00.000Z";

function member(dateOfBirth: string): HouseholdMember {
  return {
    version: 1,
    id: "member-1",
    fullName: "Workflow Member",
    dateOfBirth,
    immigrationRole: "dependant",
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function permission(
  role: "main-applicant" | "dependant",
): ImmigrationPermission {
  return {
    version: 2,
    id: "permission-1",
    profileId: "member-1",
    route: "skilled-worker",
    otherRouteName: "",
    role,
    grantDate: "2022-01-01",
    permissionStartDate: "2022-01-01",
    permissionExpiryDate: "2029-01-01",
    actualUkArrivalDate: "2022-01-01",
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function evidence(
  category: DocumentMetadata["category"],
  index: number,
): DocumentMetadata {
  return {
    version: 1,
    id: `evidence-${index}`,
    profileId: "member-1",
    displayName: `Evidence ${index}`,
    fileName: `evidence-${index}.pdf`,
    mimeType: "application/pdf",
    size: 512,
    category,
    sortOrder: index,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

describe("Document Vault workflow integration", () => {
  it("keeps every settlement requirement in readiness for an adult Skilled Worker dependant", () => {
    const notApplicable = getRouteDrivenNotApplicableRequirementIds(
      member("1990-01-01"),
      [permission("dependant")],
      "2026-09-08",
    );
    const progress = calculateDocumentVaultProgress([], {
      notApplicableRequirementIds: notApplicable,
    });

    expect(notApplicable).toEqual([]);
    expect(progress.totalRequired).toBe(8);
  });

  it("automatically removes age-exempt Life in the UK and English requirements from readiness", () => {
    const notApplicable = getRouteDrivenNotApplicableRequirementIds(
      member("2010-01-01"),
      [permission("dependant")],
      "2026-09-08",
    );
    const progress = calculateDocumentVaultProgress([], {
      notApplicableRequirementIds: notApplicable,
    });

    expect(notApplicable).toEqual(
      expect.arrayContaining(["life-in-uk", "english-language"]),
    );
    expect(progress.totalRequired).toBe(6);
    expect(
      progress.sections.find(({ id }) => id === "life-english")?.status,
    ).toBe("not-applicable");
  });

  it("changes the Skilled Worker main-applicant denominator at the 2027 English rule boundary", () => {
    const applicant = member("1990-01-01");
    const permissions = [permission("main-applicant")];

    const before = calculateDocumentVaultProgress([], {
      notApplicableRequirementIds: getRouteDrivenNotApplicableRequirementIds(
        applicant,
        permissions,
        "2027-03-25",
      ),
    });
    const fromChangeDate = calculateDocumentVaultProgress([], {
      notApplicableRequirementIds: getRouteDrivenNotApplicableRequirementIds(
        applicant,
        permissions,
        "2027-03-26",
      ),
    });

    expect(before.totalRequired).toBe(6);
    expect(fromChangeDate.totalRequired).toBe(7);
  });

  it("reaches 100% readiness only from applicable core and conditional requirements", () => {
    const documents = [
      evidence("address-proof", 0),
      evidence("employer-letter", 1),
      evidence("employment-contract", 2),
      evidence("payslip", 3),
      evidence("tax-document", 4),
      evidence("travel-evidence", 5),
      evidence("application-form", 6),
      evidence("additional-document", 7),
    ];
    const progress = calculateDocumentVaultProgress(documents, {
      addressHistoryEntryCount: 1,
      addressHistoryComplete: true,
      addressHistoryHasCurrentAddress: true,
      lifeInUkComplete: true,
      englishRequirementComplete: true,
      notApplicableRequirementIds: ["relationship-evidence"],
    });

    expect(progress.completedRequired).toBe(progress.totalRequired);
    expect(progress.readinessPercent).toBe(100);
    expect(progress.totalRequired).toBe(7);
    expect(
      progress.sections.find(({ id }) => id === "travel-absences")?.status,
    ).toBe("complete");
    expect(
      progress.sections.find(({ id }) => id === "final-application")?.status,
    ).toBe("partial");
  });
});
