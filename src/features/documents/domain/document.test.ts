import { describe, expect, it } from "vitest";
import {
  isDocumentMetadata,
  MAXIMUM_DOCUMENT_BYTES,
  resolveDocumentMimeType,
  validateDocumentSignature,
  validateDocumentUploadInput,
  type DocumentMetadata,
} from "./document";

const timestamp = "2026-08-31T08:00:00.000Z";

describe("document validation", () => {
  it("accepts supported document metadata", () => {
    const document: DocumentMetadata = {
      version: 1,
      id: "document-1",
      profileId: "owner",
      displayName: "Current passport",
      fileName: "passport.pdf",
      mimeType: "application/pdf",
      size: 1024,
      category: "passport",
      sortOrder: 0,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    expect(isDocumentMetadata(document)).toBe(true);
    expect(isDocumentMetadata({ ...document, displayName: "" })).toBe(false);
    expect(isDocumentMetadata({ ...document, profileId: "bad id" })).toBe(
      false,
    );
  });

  it("rejects unsupported, empty, and oversized uploads", () => {
    const valid = {
      displayName: "Address proof",
      category: "address-proof" as const,
      fileName: "address.pdf",
      mimeType: "application/pdf",
      size: 512,
    };
    expect(validateDocumentUploadInput(valid)).toBeNull();
    expect(
      validateDocumentUploadInput({ ...valid, mimeType: "text/plain" }),
    ).toContain("PDF");
    expect(validateDocumentUploadInput({ ...valid, size: 0 })).toContain(
      "empty",
    );
    expect(
      validateDocumentUploadInput({
        ...valid,
        size: MAXIMUM_DOCUMENT_BYTES + 1,
      }),
    ).toContain("5 MB");
  });

  it("checks file signatures instead of trusting the browser MIME type", () => {
    expect(
      validateDocumentSignature(
        "application/pdf",
        new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d]),
      ),
    ).toBeNull();
    expect(
      validateDocumentSignature(
        "image/jpeg",
        new Uint8Array([0xff, 0xd8, 0xff]),
      ),
    ).toBeNull();
    expect(
      validateDocumentSignature(
        "image/png",
        new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      ),
    ).toBeNull();
    expect(
      validateDocumentSignature(
        "application/pdf",
        new TextEncoder().encode("not a pdf"),
      ),
    ).toContain("do not match");
  });

  it("falls back to supported file extensions when the browser omits MIME type", () => {
    expect(resolveDocumentMimeType("evidence.PDF", "")).toBe("application/pdf");
    expect(resolveDocumentMimeType("photo.jpeg", "")).toBe("image/jpeg");
    expect(resolveDocumentMimeType("notes.txt", "")).toBeNull();
  });
});
