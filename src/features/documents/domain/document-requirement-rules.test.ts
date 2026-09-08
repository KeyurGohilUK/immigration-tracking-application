import { describe, expect, it } from "vitest";
import type { HouseholdMember } from "../../household/domain/household-member";
import type { ImmigrationPermission } from "../../immigration/domain/immigration-permission";
import { getRouteDrivenNotApplicableRequirementIds } from "./document-requirement-rules";

const member = (dateOfBirth: string): HouseholdMember => ({
  version: 1,
  id: "member-1",
  fullName: "Test Member",
  dateOfBirth,
  immigrationRole: "dependant",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
});

const permission = (
  role: "main-applicant" | "dependant",
): ImmigrationPermission => ({
  version: 2,
  id: "permission-1",
  profileId: "member-1",
  route: "skilled-worker",
  otherRouteName: "",
  role,
  grantDate: "2024-01-01",
  permissionStartDate: "2024-01-01",
  permissionExpiryDate: "2029-01-01",
  actualUkArrivalDate: "",
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
});

describe("route-driven Document Vault applicability", () => {
  it("keeps Life in the UK, English and relationship evidence applicable for an adult Skilled Worker dependant", () => {
    expect(
      getRouteDrivenNotApplicableRequirementIds(
        member("1990-01-01"),
        [permission("dependant")],
        "2026-09-08",
      ),
    ).toEqual([]);
  });

  it("automatically excludes Life in the UK and English for a dependant under 18 at application", () => {
    expect(
      getRouteDrivenNotApplicableRequirementIds(
        member("2010-01-01"),
        [permission("dependant")],
        "2026-09-08",
      ),
    ).toEqual(expect.arrayContaining(["life-in-uk", "english-language"]));
  });

  it("automatically excludes age-based Life in the UK and English requirements at 65 or over", () => {
    expect(
      getRouteDrivenNotApplicableRequirementIds(
        member("1960-01-01"),
        [permission("dependant")],
        "2026-09-08",
      ),
    ).toEqual(expect.arrayContaining(["life-in-uk", "english-language"]));
  });

  it("excludes relationship evidence for a Skilled Worker main applicant and English before the 2027 settlement change", () => {
    expect(
      getRouteDrivenNotApplicableRequirementIds(
        member("1990-01-01"),
        [permission("main-applicant")],
        "2026-09-08",
      ),
    ).toEqual(
      expect.arrayContaining(["relationship-evidence", "english-language"]),
    );
  });

  it("requires English for a Skilled Worker main applicant from 26 March 2027", () => {
    expect(
      getRouteDrivenNotApplicableRequirementIds(
        member("1990-01-01"),
        [permission("main-applicant")],
        "2027-03-26",
      ),
    ).toEqual(["relationship-evidence"]);
  });

  it("does not guess applicability for unsupported routes", () => {
    const unsupported = {
      ...permission("dependant"),
      route: "global-talent" as const,
    };
    expect(
      getRouteDrivenNotApplicableRequirementIds(
        member("1990-01-01"),
        [unsupported],
        "2026-09-08",
      ),
    ).toEqual([]);
  });
});
