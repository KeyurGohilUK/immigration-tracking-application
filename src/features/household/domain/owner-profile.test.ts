import { describe, expect, it } from "vitest";
import { validateOwnerInput } from "./owner-profile";

describe("owner profile validation", () => {
  it("accepts essential valid details", () =>
    expect(validateOwnerInput("Keyur Gohil", "1990-01-15")).toBeNull());
  it("rejects future dates and empty names", () => {
    expect(validateOwnerInput("", "1990-01-15")).toContain("name");
    expect(validateOwnerInput("Keyur", "2999-01-01")).toContain("future");
  });
});
