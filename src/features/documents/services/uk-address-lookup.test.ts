import { afterEach, describe, expect, it, vi } from "vitest";
import {
  lookupUkAddresses,
  normalizeUkPostcode,
  validateUkPostcode,
} from "./uk-address-lookup";

describe("UK address lookup", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  });

  it("normalises compact UK postcodes", () => {
    expect(normalizeUkPostcode("bs15ah")).toBe("BS1 5AH");
  });

  it("rejects invalid UK postcodes before calling the provider", async () => {
    expect(validateUkPostcode("not a postcode")).toContain("valid UK postcode");
    await expect(lookupUkAddresses("not a postcode")).rejects.toThrow(
      "valid UK postcode",
    );
  });

  it("maps provider addresses into full selectable labels", async () => {
    vi.stubEnv("VITE_IDEAL_POSTCODES_API_KEY", "ak_test");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            result: [
              {
                udprn: 123,
                line_1: "10 Example Road",
                line_2: "Redland",
                post_town: "Bristol",
                county: "City of Bristol",
                postcode: "BS6 6AA",
              },
            ],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      ),
    );

    await expect(lookupUkAddresses("bs66aa")).resolves.toEqual([
      {
        id: "123",
        label: "10 Example Road, Redland, Bristol, City of Bristol, BS6 6AA",
        fullAddress:
          "10 Example Road, Redland, Bristol, City of Bristol, BS6 6AA",
      },
    ]);
  });
});
