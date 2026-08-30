import { describe, expect, it } from "vitest";
import {
  isFamilyMember,
  isFamilyMemberCollection,
  validateFamilyMemberInput,
  type FamilyMember,
} from "./family-member";

const validInput = {
  fullName: "Urban Fox Test Member",
  dateOfBirth: "2000-02-29",
  relationship: "spouse-or-partner",
  immigrationRole: "dependant",
} as const;

describe("family member validation", () => {
  it("accepts a complete family member", () => {
    expect(validateFamilyMemberInput(validInput)).toBeNull();
  });

  it("rejects impossible and future birth dates", () => {
    expect(
      validateFamilyMemberInput({
        ...validInput,
        dateOfBirth: "2025-02-29",
      }),
    ).toBe("Enter a valid date of birth.");
    expect(
      validateFamilyMemberInput({
        ...validInput,
        dateOfBirth: "2999-01-01",
      }),
    ).toBe("Date of birth cannot be in the future.");
  });

  it("rejects unsupported relationship and immigration values", () => {
    expect(
      validateFamilyMemberInput({
        ...validInput,
        relationship: "friend" as never,
      }),
    ).toBe("Choose a relationship.");
    expect(
      validateFamilyMemberInput({
        ...validInput,
        immigrationRole: "visitor" as never,
      }),
    ).toBe("Choose an immigration role.");
  });

  it("validates decrypted family-member records", () => {
    const member: FamilyMember = {
      version: 1,
      id: "family-test-id",
      ...validInput,
      createdAt: "2026-08-29T10:00:00.000Z",
      updatedAt: "2026-08-29T10:00:00.000Z",
    };
    expect(isFamilyMember(member)).toBe(true);
    expect(isFamilyMember({ ...member, fullName: "" })).toBe(false);
    expect(isFamilyMember({ ...member, fullName: " Family member " })).toBe(
      false,
    );
    expect(
      isFamilyMember({
        ...member,
        updatedAt: "2026-08-29T09:59:59.000Z",
      }),
    ).toBe(false);
    expect(isFamilyMember({ ...member, version: 2 })).toBe(false);
    expect(isFamilyMemberCollection([member])).toBe(true);
    expect(isFamilyMemberCollection([member, member])).toBe(false);
  });
});
