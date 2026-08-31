import { PDFDocument } from "pdf-lib";
import { describe, expect, it } from "vitest";
import type { DecryptedDocumentFile } from "../data/document-repository";
import {
  createDocumentPack,
  getDocumentPackFileName,
} from "./document-pack-service";

async function pdfDocument(
  id: string,
  pages: number,
): Promise<DecryptedDocumentFile> {
  const source = await PDFDocument.create();
  for (let index = 0; index < pages; index += 1) source.addPage();
  const saved = await source.save();
  const bytes = new Uint8Array(saved.byteLength);
  bytes.set(saved);
  return {
    metadata: {
      version: 1,
      id,
      profileId: "owner",
      displayName: id,
      fileName: `${id}.pdf`,
      mimeType: "application/pdf",
      size: bytes.byteLength,
      category: "other",
      sortOrder: 0,
      createdAt: "2026-08-31T10:00:00.000Z",
      updatedAt: "2026-08-31T10:00:00.000Z",
    },
    bytes,
  };
}

describe("document PDF packs", () => {
  it("copies every source PDF page in document order", async () => {
    const pack = await createDocumentPack([
      await pdfDocument("first", 2),
      await pdfDocument("second", 1),
    ]);
    expect((await PDFDocument.load(pack)).getPageCount()).toBe(3);
  });

  it("requires at least one document", async () => {
    await expect(createDocumentPack([])).rejects.toThrow("at least one");
  });

  it("creates a safe and recognisable download name", () => {
    expect(getDocumentPackFileName("John Smith / Owner")).toBe(
      "John-Smith-Owner-ILR-Document-Pack.pdf",
    );
  });
});
