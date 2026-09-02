import { describe, expect, it } from "vitest";
import {
  isEnglishRequirementComplete,
  isLifeInUkComplete,
  validateLifeEnglishInput,
  type LifeEnglishRecord,
} from "./life-english";

const base: LifeEnglishRecord = {
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

describe("Life in the UK and English evidence", () => {
  it("requires a pass date when Life in the UK is marked as passed", () => {
    expect(
      validateLifeEnglishInput({ ...base, lifeInUkPassedDate: "" }),
    ).toContain("pass date");
  });

  it("requires an evidence type when English is marked as met", () => {
    expect(
      validateLifeEnglishInput({ ...base, englishEvidenceType: "" }),
    ).toContain("how the English requirement is met");
  });

  it("treats recorded exemptions as complete without references", () => {
    const exempt = {
      ...base,
      lifeInUkStatus: "exempt" as const,
      lifeInUkPassedDate: "",
      lifeInUkReference: "",
      englishStatus: "exempt" as const,
      englishEvidenceType: "",
      englishReference: "",
    };
    expect(isLifeInUkComplete(exempt)).toBe(true);
    expect(isEnglishRequirementComplete(exempt)).toBe(true);
  });

  it("does not treat unrecorded statuses as complete", () => {
    const empty = {
      ...base,
      lifeInUkStatus: "not-recorded" as const,
      lifeInUkPassedDate: "",
      englishStatus: "not-recorded" as const,
      englishEvidenceType: "",
    };
    expect(isLifeInUkComplete(empty)).toBe(false);
    expect(isEnglishRequirementComplete(empty)).toBe(false);
  });
});
