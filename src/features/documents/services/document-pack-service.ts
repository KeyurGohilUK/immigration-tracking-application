import type { DecryptedDocumentFile } from "../data/document-repository";

const A4_WIDTH = 595.28;
const A4_HEIGHT = 841.89;
const IMAGE_MARGIN = 36;

export async function createDocumentPack(
  documents: DecryptedDocumentFile[],
): Promise<Uint8Array<ArrayBuffer>> {
  if (documents.length === 0)
    throw new Error("Add at least one document before creating a PDF pack.");
  const { PDFDocument } = await import("pdf-lib");
  const pack = await PDFDocument.create();
  for (const document of documents) {
    if (document.metadata.mimeType === "application/pdf") {
      const source = await PDFDocument.load(document.bytes, {
        ignoreEncryption: false,
      });
      const pages = await pack.copyPages(source, source.getPageIndices());
      for (const page of pages) pack.addPage(page);
      continue;
    }
    const image =
      document.metadata.mimeType === "image/png"
        ? await pack.embedPng(document.bytes)
        : await pack.embedJpg(document.bytes);
    const availableWidth = A4_WIDTH - IMAGE_MARGIN * 2;
    const availableHeight = A4_HEIGHT - IMAGE_MARGIN * 2;
    const scale = Math.min(
      availableWidth / image.width,
      availableHeight / image.height,
      1,
    );
    const width = image.width * scale;
    const height = image.height * scale;
    const page = pack.addPage([A4_WIDTH, A4_HEIGHT]);
    page.drawImage(image, {
      x: (A4_WIDTH - width) / 2,
      y: (A4_HEIGHT - height) / 2,
      width,
      height,
    });
  }
  if (pack.getPageCount() === 0)
    throw new Error("The selected files contain no PDF pages.");
  const saved = await pack.save();
  const bytes = new Uint8Array(saved.byteLength);
  bytes.set(saved);
  return bytes;
}

export function getDocumentPackFileName(profileName: string): string {
  const safeName = profileName
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return `${safeName || "UrbanFox"}-ILR-Document-Pack.pdf`;
}

export function downloadDocumentPack(
  bytes: Uint8Array<ArrayBuffer>,
  profileName: string,
): void {
  const blob = new Blob([bytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = getDocumentPackFileName(profileName);
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}
