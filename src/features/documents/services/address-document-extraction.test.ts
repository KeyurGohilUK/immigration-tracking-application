import { describe, expect, it } from "vitest";
import {
  extractLikelyUkAddressFromPdf,
  findLikelyUkAddress,
} from "./address-document-extraction";

describe("address document extraction", () => {
  it("finds a likely UK address around a postcode", () => {
    expect(
      findLikelyUkAddress([
        "Statement",
        "Keyur Gohil",
        "10 Example Road",
        "Redland",
        "Bristol",
        "BS6 6AA",
      ]),
    ).toEqual({
      fullAddress: "Keyur Gohil, 10 Example Road, Redland, Bristol, BS6 6AA",
      postcode: "BS6 6AA",
    });
  });

  it("returns null when a postcode has no address-like street context", () => {
    expect(findLikelyUkAddress(["Reference", "Bristol", "BS6 6AA"])).toBeNull();
  });

  it("reads address text from a simple text PDF locally", async () => {
    const source =
      "%PDF-1.4\n1 0 obj<<>>stream\nBT (10 Example Road) Tj (Bristol) Tj (BS6 6AA) Tj ET\nendstream\nendobj\n%%EOF";
    const file = new File([source], "proof.pdf", { type: "application/pdf" });

    await expect(extractLikelyUkAddressFromPdf(file)).resolves.toEqual({
      fullAddress: "10 Example Road, Bristol, BS6 6AA",
      postcode: "BS6 6AA",
    });
  });

  it("ignores non-PDF evidence", async () => {
    const file = new File(["image"], "proof.jpg", { type: "image/jpeg" });
    await expect(extractLikelyUkAddressFromPdf(file)).resolves.toBeNull();
  });
});
