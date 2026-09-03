import type { PDFFont } from "pdf-lib";
import type { DecryptedDocumentFile } from "../data/document-repository";
import {
  formatStructuredAddress,
  type AddressHistoryEntry,
} from "../domain/address-history";
import type { DocumentMetadata } from "../domain/document";

const A4_WIDTH = 595.28;
const A4_HEIGHT = 841.89;
const PAGE_MARGIN = 40;
const ROW_GAP = 12;
const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;

export interface AddressEvidenceExportItem {
  documentId: string;
  addressId: string;
  addressLabel: string;
  exportedFileName: string;
}

export interface AddressHistoryIndexRow {
  addressLabel: string;
  from: string;
  to: string;
  fullAddress: string;
  evidenceFileNames: string[];
}

export interface AddressEvidenceExportPlan {
  indexRows: AddressHistoryIndexRow[];
  evidenceFiles: AddressEvidenceExportItem[];
}

export function buildAddressEvidenceExportPlan(
  addresses: readonly AddressHistoryEntry[],
  documents: readonly DocumentMetadata[],
): AddressEvidenceExportPlan {
  const ordered = getDisplayAddresses(addresses);
  const evidenceFiles: AddressEvidenceExportItem[] = [];
  const indexRows: AddressHistoryIndexRow[] = [];
  const usedNames = new Set<string>();

  for (const { entry, label } of ordered) {
    const linked = documents
      .filter(
        ({ category, addressHistoryId }) =>
          category === "address-proof" && addressHistoryId === entry.id,
      )
      .sort(
        (left, right) =>
          left.sortOrder - right.sortOrder ||
          left.createdAt.localeCompare(right.createdAt),
      );
    const fileNames = linked.map((document) => {
      const exportedFileName = getUniqueExportFileName(
        `${label} - ${document.fileName}`,
        usedNames,
      );
      evidenceFiles.push({
        documentId: document.id,
        addressId: entry.id,
        addressLabel: label,
        exportedFileName,
      });
      return exportedFileName;
    });
    indexRows.push({
      addressLabel: label,
      from: formatMonth(entry.startMonth),
      to: entry.isCurrent ? "Present" : formatMonth(entry.endMonth),
      fullAddress: formatStructuredAddress(entry.address),
      evidenceFileNames: fileNames,
    });
  }

  return { indexRows, evidenceFiles };
}

export async function createAddressHistoryIndexPdf(
  rows: readonly AddressHistoryIndexRow[],
  profileName: string,
): Promise<Uint8Array<ArrayBuffer>> {
  if (rows.length === 0)
    throw new Error("Add at least one address before creating the index.");

  const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  let page = pdf.addPage([A4_WIDTH, A4_HEIGHT]);
  let y = drawPageHeader(page, profileName, bold, font, rgb, false);

  for (const row of rows) {
    const rowHeight = estimateRowHeight(row, font);
    if (y - rowHeight < 55) {
      page = pdf.addPage([A4_WIDTH, A4_HEIGHT]);
      y = drawPageHeader(page, profileName, bold, font, rgb, true);
    }
    y = drawIndexRow(page, row, y, bold, font, rgb);
  }

  const pages = pdf.getPages();
  pages.forEach((current, index) => {
    const label = `Page ${index + 1} of ${pages.length}`;
    current.drawText(label, {
      x: PAGE_MARGIN,
      y: 24,
      size: 8,
      font,
      color: rgb(0.45, 0.45, 0.48),
    });
  });

  const saved = await pdf.save();
  const bytes = new Uint8Array(saved.byteLength);
  bytes.set(saved);
  return bytes;
}

export function getAddressHistoryIndexFileName(profileName: string): string {
  return `${safeFileStem(profileName || "UrbanFox")}-Address-History-Index.pdf`;
}

export function downloadAddressHistoryIndex(
  bytes: Uint8Array<ArrayBuffer>,
  profileName: string,
): void {
  downloadBytes(bytes, "application/pdf", getAddressHistoryIndexFileName(profileName));
}

export function downloadAddressEvidenceFile(
  file: DecryptedDocumentFile,
  exportedFileName: string,
): void {
  downloadBytes(file.bytes, file.metadata.mimeType, exportedFileName);
}

function downloadBytes(
  bytes: Uint8Array<ArrayBuffer>,
  mimeType: string,
  fileName: string,
): void {
  const blob = new Blob([bytes], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function getDisplayAddresses(
  entries: readonly AddressHistoryEntry[],
): { entry: AddressHistoryEntry; label: string }[] {
  let previousAddressNumber = 0;
  return [...entries]
    .sort((left, right) => right.startMonth.localeCompare(left.startMonth))
    .map((entry) => ({
      entry,
      label: entry.isCurrent
        ? "Current address"
        : `Previous address ${(previousAddressNumber += 1)}`,
    }));
}

function getUniqueExportFileName(
  proposed: string,
  usedNames: Set<string>,
): string {
  const cleaned = sanitizeFileName(proposed);
  if (!usedNames.has(cleaned.toLowerCase())) {
    usedNames.add(cleaned.toLowerCase());
    return cleaned;
  }

  const dot = cleaned.lastIndexOf(".");
  const stem = dot > 0 ? cleaned.slice(0, dot) : cleaned;
  const extension = dot > 0 ? cleaned.slice(dot) : "";
  let counter = 2;
  let candidate = `${stem} (${counter})${extension}`;
  while (usedNames.has(candidate.toLowerCase())) {
    counter += 1;
    candidate = `${stem} (${counter})${extension}`;
  }
  usedNames.add(candidate.toLowerCase());
  return candidate;
}

function sanitizeFileName(value: string): string {
  const normalized = value
    .normalize("NFKD")
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
  return normalized.slice(0, 180) || "Address evidence";
}

function safeFileStem(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "UrbanFox";
}

function formatMonth(month: string): string {
  const [yearText, monthText] = month.split("-");
  const year = Number(yearText);
  const month = Number(monthText);
  const label = MONTH_NAMES[month - 1];
  return label && Number.isInteger(year) ? `${label} ${year}` : month;
}

function drawPageHeader(
  page: import("pdf-lib").PDFPage,
  profileName: string,
  bold: PDFFont,
  font: PDFFont,
  rgb: typeof import("pdf-lib").rgb,
  continued: boolean,
): number {
  page.drawText(
    continued ? "Address History Index (continued)" : "Address History Index",
    {
      x: PAGE_MARGIN,
      y: 795,
      size: continued ? 14 : 19,
      font: bold,
      color: rgb(0.12, 0.12, 0.14),
    },
  );
  page.drawText(`Applicant: ${toPdfText(profileName)}`, {
    x: PAGE_MARGIN,
    y: 774,
    size: 9,
    font,
    color: rgb(0.35, 0.35, 0.38),
  });
  if (!continued)
    page.drawText(
      "Address periods and the filenames of individually downloaded supporting evidence.",
      {
        x: PAGE_MARGIN,
        y: 758,
        size: 8,
        font,
        color: rgb(0.42, 0.42, 0.45),
      },
    );
  return continued ? 748 : 730;
}

function estimateRowHeight(row: AddressHistoryIndexRow, font: PDFFont): number {
  const addressLines = wrapText(toPdfText(row.fullAddress), 490, font, 9).length;
  const evidenceLines = (
    row.evidenceFileNames.length > 0
      ? row.evidenceFileNames
      : ["No evidence attached"]
  ).reduce(
    (total, name) =>
      total + wrapText(toPdfText(name), 470, font, 8).length,
    0,
  );
  return 46 + addressLines * 11 + evidenceLines * 10 + ROW_GAP;
}

function drawIndexRow(
  page: import("pdf-lib").PDFPage,
  row: AddressHistoryIndexRow,
  y: number,
  bold: PDFFont,
  font: PDFFont,
  rgb: typeof import("pdf-lib").rgb,
): number {
  page.drawText(toPdfText(row.addressLabel), {
    x: PAGE_MARGIN,
    y,
    size: 10,
    font: bold,
    color: rgb(0.16, 0.16, 0.18),
  });
  page.drawText(`${row.from} - ${row.to}`, {
    x: 380,
    y,
    size: 8,
    font,
    color: rgb(0.35, 0.35, 0.38),
  });
  y -= 15;

  for (const line of wrapText(toPdfText(row.fullAddress), 490, font, 9)) {
    page.drawText(line, {
      x: PAGE_MARGIN,
      y,
      size: 9,
      font,
      color: rgb(0.22, 0.22, 0.24),
    });
    y -= 11;
  }

  y -= 3;
  page.drawText("Evidence files", {
    x: PAGE_MARGIN,
    y,
    size: 8,
    font: bold,
    color: rgb(0.36, 0.36, 0.39),
  });
  y -= 11;

  const files =
    row.evidenceFileNames.length > 0
      ? row.evidenceFileNames
      : ["No evidence attached"];
  for (const fileName of files) {
    for (const line of wrapText(toPdfText(`• ${fileName}`), 470, font, 8)) {
      page.drawText(line, {
        x: PAGE_MARGIN + 10,
        y,
        size: 8,
        font,
        color: rgb(0.3, 0.3, 0.33),
      });
      y -= 10;
    }
  }

  page.drawLine({
    start: { x: PAGE_MARGIN, y: y - 4 },
    end: { x: A4_WIDTH - PAGE_MARGIN, y: y - 4 },
    thickness: 0.5,
    color: rgb(0.86, 0.86, 0.88),
  });
  return y - ROW_GAP;
}

function wrapText(
  value: string,
  maximumWidth: number,
  font: PDFFont,
  size: number,
): string[] {
  const words = value.trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return [""];
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maximumWidth) {
      line = candidate;
      continue;
    }
    if (line) lines.push(line);
    line = word;
  }
  if (line) lines.push(line);
  return lines;
}

function toPdfText(value: string): string {
  return value
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-")
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\x20-\x7E]/g, "?");
}
