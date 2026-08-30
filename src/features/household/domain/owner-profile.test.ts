import { describe, expect, it } from "vitest";
import {
  isOwnerProfile,
  validateOwnerInput,
  type OwnerProfile,
} from "./owner-profile";

describe("owner profile validation", () => {
  it("accepts essential valid details", () =>
    expect(
      validateOwnerInput("Test Household Owner", "1990-01-15"),
    ).toBeNull());
  it("rejects future dates and empty names", () => {
    expect(validateOwnerInput("", "1990-01-15")).toContain("name");
    expect(validateOwnerInput("Test Owner", "2999-01-01")).toContain("future");
  });

  it("rejects impossible dates and malformed stored metadata", () => {
    expect(validateOwnerInput("Test Owner", "2025-02-29")).toContain("valid");
    const profile: OwnerProfile = {
      version: 1,
      id: "owner",
      fullName: "Test Household Owner",
      dateOfBirth: "1990-01-15",
      createdAt: "2026-08-30T10:00:00.000Z",
      updatedAt: "2026-08-30T10:00:00.000Z",
    };
    expect(isOwnerProfile(profile)).toBe(true);
    expect(
      isOwnerProfile({ ...profile, fullName: " Test Household Owner " }),
    ).toBe(false);
    expect(isOwnerProfile({ ...profile, updatedAt: "not-a-date" })).toBe(false);
  });
});
