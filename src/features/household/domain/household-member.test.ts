import { describe, expect, it } from "vitest";
import {
  isHouseholdMember,
  isHouseholdMemberCollection,
  validateHouseholdMemberInput,
  type HouseholdMember,
} from "./household-member";

const validInput = {
  fullName: "Urban Fox Test Member",
  dateOfBirth: "2000-02-29",
  immigrationRole: "dependant",
} as const;

describe("household member validation", () => {
  it("accepts a complete household member", () => {
    expect(validateHouseholdMemberInput(validInput)).toBeNull();
  });

  it("rejects impossible and future birth dates", () => {
    expect(
      validateHouseholdMemberInput({
        ...validInput,
        dateOfBirth: "2025-02-29",
      }),
    ).toBe("Enter a valid date of birth.");
    expect(
      validateHouseholdMemberInput({
        ...validInput,
        dateOfBirth: "2999-01-01",
      }),
    ).toBe("Date of birth cannot be in the future.");
  });

  it("rejects unsupported immigration values", () => {
    expect(
      validateHouseholdMemberInput({
        ...validInput,
        immigrationRole: "visitor" as never,
      }),
    ).toBe("Choose an immigration role.");
  });

  it("validates decrypted household-member records", () => {
    const member: HouseholdMember = {
      version: 1,
      id: "member-test-id",
      ...validInput,
      createdAt: "2026-08-29T10:00:00.000Z",
      updatedAt: "2026-08-29T10:00:00.000Z",
    };
    expect(isHouseholdMember(member)).toBe(true);
    expect(isHouseholdMember({ ...member, fullName: "" })).toBe(false);
    expect(isHouseholdMember({ ...member, fullName: " Member " })).toBe(false);
    expect(
      isHouseholdMember({
        ...member,
        updatedAt: "2026-08-29T09:59:59.000Z",
      }),
    ).toBe(false);
    expect(isHouseholdMember({ ...member, version: 2 })).toBe(false);
    expect(isHouseholdMemberCollection([member])).toBe(true);
    expect(isHouseholdMemberCollection([member, member])).toBe(false);
  });
});
