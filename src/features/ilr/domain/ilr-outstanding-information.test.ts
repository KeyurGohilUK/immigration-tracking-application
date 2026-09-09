import { describe, expect, it } from "vitest";
import type { AbsenceCheckResult } from "../../calculation/domain/absence-calculation";
import type { QualifyingPeriodResult } from "../../calculation/domain/qualifying-period-calculation";
import type { DocumentVaultProgress } from "../../documents/domain/document-vault";
import type { LifeEnglishRecord } from "../../documents/domain/life-english";
import { getIlrOutstandingInformation } from "./ilr-outstanding-information";

const period: QualifyingPeriodResult = {
  status: "not-yet-complete",
  qualifyingStartDate: "2022-01-01",
  qualifyingCompletionDate: "2027-01-01",
  earliestApplicationDate: "2026-12-04",
  issues: [],
  relevantPermissionIds: ["permission-1"],
};

const absence: AbsenceCheckResult = {
  status: "within-recorded-limit",
  routeLabel: "Skilled Worker",
  recordedTripCount: 1,
  maximumRecordedDays: 14,
  maximumWindow: {
    startDate: "2024-01-01",
    endDate: "2024-12-31",
    daysOutside: 14,
  },
  issues: [],
};

const lifeEnglish: LifeEnglishRecord = {
  version: 1,
  profileId: "owner",
  lifeInUkStatus: "passed",
  lifeInUkPassedDate: "2026-08-20",
  lifeInUkReference: "UAN-123",
  englishStatus: "met",
  englishEvidenceType: "Approved qualification",
  englishReference: "REF-456",
  notes: "",
  createdAt: "2026-09-01T12:00:00.000Z",
  updatedAt: "2026-09-01T12:00:00.000Z",
};

const documentVault: DocumentVaultProgress = {
  readinessPercent: 100,
  completedRequired: 7,
  totalRequired: 7,
  completedSections: 6,
  sections: [
    {
      id: "life-english",
      requirements: [
        { id: "life-in-uk", notApplicable: false },
        { id: "english-language", notApplicable: false },
      ],
    },
  ] as DocumentVaultProgress["sections"],
};

describe("ILR outstanding information", () => {
  it("shows no outstanding information when the tracked journey is complete", () => {
    expect(
      getIlrOutstandingInformation(
        period,
        absence,
        lifeEnglish,
        documentVault,
      ),
    ).toEqual([]);
  });

  it("surfaces missing permission history, requirements and Vault readiness", () => {
    const result = getIlrOutstandingInformation(
      {
        ...period,
        status: "incomplete",
        qualifyingStartDate: null,
        qualifyingCompletionDate: null,
        earliestApplicationDate: null,
        issues: ["no-permission-history"],
        relevantPermissionIds: [],
      },
      { ...absence, status: "incomplete", routeLabel: null },
      null,
      {
        ...documentVault,
        readinessPercent: 43,
        completedRequired: 3,
        totalRequired: 7,
      },
    );

    expect(result.map(({ id }) => id)).toEqual([
      "permission-history",
      "absence-review",
      "english-language",
      "life-in-uk",
      "document-vault",
    ]);
    expect(result.at(-1)?.detail).toBe(
      "4 applicable required items are still outstanding.",
    );
  });

  it("does not show route-driven Not applicable Life or English items as outstanding", () => {
    const result = getIlrOutstandingInformation(
      period,
      absence,
      null,
      {
        ...documentVault,
        readinessPercent: 100,
        sections: [
          {
            id: "life-english",
            requirements: [
              { id: "life-in-uk", notApplicable: true },
              { id: "english-language", notApplicable: true },
            ],
          },
        ] as DocumentVaultProgress["sections"],
      },
    );

    expect(result).toEqual([]);
  });

  it("calls out open and potentially permitted travel records for review", () => {
    const openTrip = getIlrOutstandingInformation(
      period,
      {
        ...absence,
        status: "incomplete",
        issues: ["open-trip"],
      },
      lifeEnglish,
      documentVault,
    );
    expect(openTrip[0]).toMatchObject({
      id: "absence-review",
      severity: "review",
    });
    expect(openTrip[0]?.detail).toContain("return date");

    const exceptional = getIlrOutstandingInformation(
      period,
      {
        ...absence,
        status: "manual-review",
        issues: ["potentially-permitted"],
      },
      lifeEnglish,
      documentVault,
    );
    expect(exceptional[0]?.detail).toContain("exceptional");
  });
});
