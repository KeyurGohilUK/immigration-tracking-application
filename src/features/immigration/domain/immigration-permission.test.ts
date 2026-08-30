import { describe, expect, it } from "vitest";
import {
  getCalculationSupportMessage,
  isImmigrationPermissionCollection,
  migrateImmigrationPermissionCollection,
  validateImmigrationPermissionInput,
  type ImmigrationPermission,
} from "./immigration-permission";

const validInput = {
  route: "skilled-worker",
  otherRouteName: "",
  role: "main-applicant",
  grantDate: "2023-12-15",
  permissionStartDate: "2024-01-01",
  permissionExpiryDate: "2026-12-31",
  actualUkArrivalDate: "2024-01-15",
} as const;

describe("immigration permission validation", () => {
  it("accepts separately recorded permission and arrival dates", () => {
    expect(validateImmigrationPermissionInput(validInput)).toBeNull();
  });

  it("rejects reversed permission dates and arrival outside the permission", () => {
    expect(
      validateImmigrationPermissionInput({
        ...validInput,
        permissionStartDate: "2027-01-01",
      }),
    ).toBe("Permission expiry must be on or after its start date.");
    expect(
      validateImmigrationPermissionInput({
        ...validInput,
        actualUkArrivalDate: "2023-12-31",
      }),
    ).toBe("Actual UK arrival must fall within this permission period.");
  });

  it("requires a name for routes that are not listed", () => {
    expect(
      validateImmigrationPermissionInput({
        ...validInput,
        route: "other",
      }),
    ).toBe("Enter the permission route name.");
  });

  it("rejects duplicate identifiers or records belonging to another person", () => {
    const permission: ImmigrationPermission = {
      version: 2,
      id: "permission-test-id",
      profileId: "owner",
      ...validInput,
      createdAt: "2026-08-29T10:00:00.000Z",
      updatedAt: "2026-08-29T10:00:00.000Z",
    };
    expect(isImmigrationPermissionCollection([permission], "owner")).toBe(true);
    expect(
      isImmigrationPermissionCollection([permission, permission], "owner"),
    ).toBe(false);
    expect(isImmigrationPermissionCollection([permission], "another")).toBe(
      false,
    );
  });

  it("migrates existing version 1 records with a missing grant date", () => {
    const legacy = {
      version: 1,
      id: "legacy-permission",
      profileId: "owner",
      route: "skilled-worker",
      otherRouteName: "",
      role: "main-applicant",
      permissionStartDate: "2024-01-01",
      permissionExpiryDate: "2026-12-31",
      actualUkArrivalDate: "2024-01-15",
      createdAt: "2026-08-29T10:00:00.000Z",
      updatedAt: "2026-08-29T10:00:00.000Z",
    };
    expect(migrateImmigrationPermissionCollection([legacy], "owner")).toEqual([
      { ...legacy, version: 2, grantDate: "" },
    ]);
  });

  it("never describes a route as calculation-ready", () => {
    expect(getCalculationSupportMessage("skilled-worker")).toContain(
      "recorded absence check",
    );
    expect(getCalculationSupportMessage("other")).toContain("not supported");
  });
});
