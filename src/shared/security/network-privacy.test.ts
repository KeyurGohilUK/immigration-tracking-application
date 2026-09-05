import { describe, expect, it } from "vitest";
import { findSensitiveNetworkLeak } from "./network-privacy";

describe("network privacy leak detector", () => {
  it("detects sensitive values in URLs, headers, and request bodies", () => {
    expect(
      findSensitiveNetworkLeak(
        {
          url: "https://example.test/?name=Private%20Person",
          headers: {},
          postData: null,
        },
        ["Private Person"],
      ),
    ).toBe("Private Person");

    expect(
      findSensitiveNetworkLeak(
        {
          url: "https://example.test/",
          headers: { "x-profile": "SECRET-REFERENCE-991" },
          postData: null,
        },
        ["secret-reference-991"],
      ),
    ).toBe("secret-reference-991");

    expect(
      findSensitiveNetworkLeak(
        {
          url: "https://example.test/",
          headers: {},
          postData: JSON.stringify({ destination: "Private Destination" }),
        },
        ["Private Destination"],
      ),
    ).toBe("Private Destination");
  });

  it("does not flag unrelated update checks and static requests", () => {
    expect(
      findSensitiveNetworkLeak(
        {
          url: "https://example.test/release.json?check=123",
          headers: { accept: "application/json" },
          postData: null,
        },
        ["Private Person", "BS1 1AA", "backup-password-marker"],
      ),
    ).toBeNull();
  });
});
