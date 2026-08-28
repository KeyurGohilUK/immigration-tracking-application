import { describe, expect, it } from "vitest";
import { CURRENT_TERMS_VERSION } from "../../../configuration/legal-metadata";
import { isCurrentTermsAcceptance } from "./terms-acceptance";

describe("terms acceptance", () => {
  it("accepts the current version with a valid date", () => {
    expect(
      isCurrentTermsAcceptance({
        version: CURRENT_TERMS_VERSION,
        acceptedAt: "2026-08-29T10:00:00.000Z",
      }),
    ).toBe(true);
  });

  it("requires renewed acceptance for an older version", () => {
    expect(
      isCurrentTermsAcceptance({
        version: "2026-01-01",
        acceptedAt: "2026-01-01T10:00:00.000Z",
      }),
    ).toBe(false);
  });
});
