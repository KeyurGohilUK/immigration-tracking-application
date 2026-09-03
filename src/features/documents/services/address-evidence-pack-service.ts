import type { PDFDocument as PdfLibDocument, PDFFont } from "pdf-lib";
import type { DecryptedDocumentFile } from "../data/document-repository";
import {
  formatStructuredAddress,
  type AddressHistoryEntry,
} from "../domain/address-history";
import type { DocumentMetadata } from "../domain/document";

const A4_WIDTH = 595.28;
const A4_HEIGHT = 841.89;
const PAGE_MARGIN = 36;
const INDEX_FONT_SIZE = 7.5;
const INDEX_LINE_HEIGHT = 9;
const INDEX_HEADER_HEIGHT = 22;
const INDEX_BOTTOM_Y = 44;
const INDEX_FIRST_PAGE_TOP_Y = 742;
const INDEX_CONTINUED_TOP_Y = 780;
const EVIDENCE_MARGIN = 36;

export interface AddressEvidencePageSource {
  metadata: DocumentMetadata;
  pageCount: number;
}

export interface AddressEvidenceIndexRow {
  addressNumber: number;
  from: string;
  to: string;
  fullAddress: string;
  supportingDocument: string;
  pages: string;
  documentId?: string;
}

interface PreparedEvidence {
  file: DecryptedDocumentFile;
  pageCount: number;
  sourcePdf?: PdfLibDocument;
}

interface TableRowLayout {
  row: AddressEvidenceIndexRow;
  height: number;
  addressLines: string[];
  documentLines: string[];
}

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

export async function createAddressEvidencePack(
  addresses: readonly AddressHistoryEntry[],
  documents: readonly DecryptedDocumentFile[],
  profileName: string,
): Promise<Uint8Array<ArrayBuffer>> {
  if (addresses.length === 0)
    throw new Error(
      "Add at least one address before creating an Address History PDF.",
    );

  const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");
  const pack = await PDFDocument.create();
  const font = await pack.embedFont(StandardFonts.Helvetica);
  const boldFont = await pack.embedFont(StandardFonts.HelveticaBold);
  const prepared = await prepareEvidence(documents, PDFDocument);

  const preliminaryRows = buildAddressEvidenceIndexRows(
    addresses,
    prepared.map(({ file, pageCount }) => ({
      metadata: file.metadata,
      pageCount,
    })),
    1,
  );
  const preliminaryPages = paginateIndexRows(preliminaryRows, font);
  const rows = buildAddressEvidenceIndexRows(
    addresses,
    prepared.map(({ file, pageCount }) => ({
      metadata: file.metadata,
      pageCount,
    })),
    preliminaryPages.length,
  );
  const indexPages = paginateIndexRows(rows, font);

  indexPages.forEach((pageRows, index) => {
    const page = pack.addPage([A4_WIDTH, A4_HEIGHT]);
    drawIndexPage(
      page,
      pageRows,
      index,
      indexPages.length,
      profileName,
      font,
      boldFont,
      rgb,
    );
  });

  const preparedById = new Map(
    prepared.map((item) => [item.file.metadata.id, item]),
  );
  for (const row of rows) {
    if (!row.documentId) continue;
    const item = preparedById.get(row.documentId);
    if (!item) continue;
    await appendEvidence(pack, item);
  }

  addPageNumbers(pack, font, rgb);

  const saved = await pack.save();
  const bytes = new Uint8Array(saved.byteLength);
  bytes.set(saved);
  return bytes;
}

export function buildAddressEvidenceIndexRows(
  addresses: readonly AddressHistoryEntry[],
  evidence: readonly AddressEvidencePageSource[],
  indexPageCount: number,
): AddressEvidenceIndexRow[] {
  if (!Number.isInteger(indexPageCount) || indexPageCount < 1)
    throw new Error("Address evidence index page count is invalid.");

  const orderedAddresses = [...addresses].sort(
    (left, right) =>
      left.startMonth.localeCompare(right.startMonth) ||
      left.createdAt.localeCompare(right.createdAt),
  );
  const evidenceByAddress = new Map<string, AddressEvidencePageSource[]>();
  for (const source of evidence) {
    if (
      source.metadata.category !== "address-proof" ||
      !source.metadata.addressHistoryId ||
      source.pageCount < 1
    )
      continue;
    const collection =
      evidenceByAddress.get(source.metadata.addressHistoryId) ?? [];
    collection.push(source);
    evidenceByAddress.set(source.metadata.addressHistoryId, collection);
  }
  for (const collection of evidenceByAddress.values())
    collection.sort(
      (left, right) =>
        left.metadata.sortOrder - right.metadata.sortOrder ||
        left.metadata.createdAt.localeCompare(right.metadata.createdAt),
    );

  let nextPage = indexPageCount + 1;
  const rows: AddressEvidenceIndexRow[] = [];
  orderedAddresses.forEach((address, addressIndex) => {
    const linked = evidenceByAddress.get(address.id) ?? [];
    if (linked.length === 0) {
      rows.push({
        addressNumber: addressIndex + 1,
        from: formatMonth(address.startMonth),
        to: address.isCurrent ? "Present" : formatMonth(address.endMonth),
        fullAddress: formatStructuredAddress(address.address),
        supportingDocument: "No evidence attached",
        pages: "-",
      });
      return;
    }

    for (const source of linked) {
      const startPage = nextPage;
      const endPage = startPage + source.pageCount - 1;
      rows.push({
        addressNumber: addressIndex + 1,
        from: formatMonth(address.startMonth),
        to: address.isCurrent ? "Present" : formatMonth(address.endMonth),
        fullAddress: formatStructuredAddress(address.address),
        supportingDocument: source.metadata.displayName,
        pages:
          startPage === endPage
            ? String(startPage)
            : `${startPage}-${endPage}`,
        documentId: source.metadata.id,
      });
      nextPage = endPage + 1;
    }
  });

  return rows;
}

export function getAddressEvidencePackFileName(profileName: string): string {
  const safeName = profileName
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
  return `${safeName || "UrbanFox"}-Address-History-Evidence.pdf`;
}

export function downloadAddressEvidencePack(
  bytes: Uint8Array<ArrayBuffer>,
  profileName: string,
): void {
  const blob = new Blob([bytes], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = getAddressEvidencePackFileName(profileName);
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

async function prepareEvidence(
  documents: readonly DecryptedDocumentFile[],
  PDFDocument: typeof import("pdf-lib").PDFDocument,
): Promise<PreparedEvidence[]> {
  const addressDocuments = documents
    .filter(
      ({ metadata }) =>
        metadata.category === "address-proof" &&
        metadata.addressHistoryId !== undefined,
    )
    .sort(
      (left, right) =>
        left.metadata.sortOrder - right.metadata.sortOrder ||
        left.metadata.createdAt.localeCompare(right.metadata.createdAt),
    );

  return Promise.all(
    addressDocuments.map(async (file) => {
      if (file.metadata.mimeType !== "application/pdf")
        return { file, pageCount: 1 };
      const sourcePdf = await PDFDocument.load(file.bytes, {
        ignoreEncryption: false,
      });
      return {
        file,
        pageCount: sourcePdf.getPageCount(),
        sourcePdf,
      };
    }),
  );
}

function paginateIndexRows(
  rows: readonly AddressEvidenceIndexRow[],
  font: PDFFont,
): TableRowLayout[][] {
  const layouts = rows.map((row) => layoutTableRow(row, font));
  const pages: TableRowLayout[][] = [];
  let currentPage: TableRowLayout[] = [];
  let remainingHeight =
    INDEX_FIRST_PAGE_TOP_Y - INDEX_HEADER_HEIGHT - INDEX_BOTTOM_Y;

  for (const layout of layouts) {
    if (currentPage.length > 0 && layout.height > remainingHeight) {
      pages.push(currentPage);
      currentPage = [];
      remainingHeight =
        INDEX_CONTINUED_TOP_Y - INDEX_HEADER_HEIGHT - INDEX_BOTTOM_Y;
    }
    currentPage.push(layout);
    remainingHeight -= layout.height;
  }
  if (currentPage.length > 0) pages.push(currentPage);
  return pages.length > 0 ? pages : [[]];
}

function layoutTableRow(
  row: AddressEvidenceIndexRow,
  font: PDFFont,
): TableRowLayout {
  const addressLines = wrapText(
    toPdfText(row.fullAddress),
    180,
    font,
    INDEX_FONT_SIZE,
  );
  const documentLines = wrapText(
    toPdfText(row.supportingDocument),
    145,
    font,
    INDEX_FONT_SIZE,
  );
  const lineCount = Math.max(addressLines.length, documentLines.length, 1);
  return {
    row,
    height: Math.max(22, lineCount * INDEX_LINE_HEIGHT + 8),
    addressLines,
    documentLines,
  };
}

function drawIndexPage(
  page: import("pdf-lib").PDFPage,
  rows: readonly TableRowLayout[],
  pageIndex: number,
  indexPageCount: number,
  profileName: string,
  font: PDFFont,
  boldFont: PDFFont,
  rgb: typeof import("pdf-lib").rgb,
): void {
  const firstPage = pageIndex === 0;
  page.drawText(
    firstPage
      ? "Address History & Evidence Index"
      : "Address History & Evidence Index (continued)",
    {
      x: PAGE_MARGIN,
      y: firstPage ? 795 : 805,
      size: firstPage ? 18 : 13,
      font: boldFont,
      color: rgb(0.12, 0.12, 0.14),
    },
  );
  if (firstPage) {
    page.drawText(`Applicant: ${toPdfText(profileName)}`, {
      x: PAGE_MARGIN,
      y: 773,
      size: 9,
      font,
      color: rgb(0.32, 0.32, 0.36),
    });
    page.drawText(
      "Evidence pages follow the index in chronological address order.",
      {
        x: PAGE_MARGIN,
        y: 757,
        size: 8,
        font,
        color: rgb(0.4, 0.4, 0.44),
      },
    );
  }

  const widths = [26, 54, 54, 180, 145, 60] as const;
  const labels = ["#", "From", "To", "Full address", "Supporting document", "Pages"];
  const topY = firstPage ? INDEX_FIRST_PAGE_TOP_Y : INDEX_CONTINUED_TOP_Y;
  let x = PAGE_MARGIN;
  page.drawRectangle({
    x: PAGE_MARGIN,
    y: topY - INDEX_HEADER_HEIGHT,
    width: widths.reduce((sum, width) => sum + width, 0),
    height: INDEX_HEADER_HEIGHT,
    color: rgb(0.93, 0.93, 0.95),
  });
  labels.forEach((label, index) => {
    page.drawText(label, {
      x: x + 4,
      y: topY - 14,
      size: 7,
      font: boldFont,
      color: rgb(0.16, 0.16, 0.18),
    });
    x += widths[index] ?? 0;
  });

  let y = topY - INDEX_HEADER_HEIGHT;
  rows.forEach((layout, rowIndex) => {
    y -= layout.height;
    if (rowIndex % 2 === 1)
      page.drawRectangle({
        x: PAGE_MARGIN,
        y,
        width: widths.reduce((sum, width) => sum + width, 0),
        height: layout.height,
        color: rgb(0.975, 0.975, 0.98),
      });

    const values = [
      String(layout.row.addressNumber),
      layout.row.from,
      layout.row.to,
    ];
    x = PAGE_MARGIN;
    values.forEach((value, index) => {
      page.drawText(toPdfText(value), {
        x: x + 4,
        y: y + layout.height - 13,
        size: INDEX_FONT_SIZE,
        font,
        color: rgb(0.2, 0.2, 0.22),
      });
      x += widths[index] ?? 0;
    });

    drawWrappedLines(
      page,
      layout.addressLines,
      PAGE_MARGIN + widths[0] + widths[1] + widths[2] + 4,
      y + layout.height - 13,
      font,
      rgb,
    );
    drawWrappedLines(
      page,
      layout.documentLines,
      PAGE_MARGIN +
        widths[0] +
        widths[1] +
        widths[2] +
        widths[3] +
        4,
      y + layout.height - 13,
      font,
      rgb,
    );
    page.drawText(layout.row.pages, {
      x:
        PAGE_MARGIN +
        widths[0] +
        widths[1] +
        widths[2] +
        widths[3] +
        widths[4] +
        4,
      y: y + layout.height - 13,
      size: INDEX_FONT_SIZE,
      font,
      color: rgb(0.2, 0.2, 0.22),
    });
  });

  if (indexPageCount > 1)
    page.drawText(`Index ${pageIndex + 1} of ${indexPageCount}`, {
      x: PAGE_MARGIN,
      y: 26,
      size: 7,
      font,
      color: rgb(0.45, 0.45, 0.48),
    });
}

function drawWrappedLines(
  page: import("pdf-lib").PDFPage,
  lines: readonly string[],
  x: number,
  y: number,
  font: PDFFont,
  rgb: typeof import("pdf-lib").rgb,
): void {
  lines.forEach((line, index) =>
    page.drawText(line, {
      x,
      y: y - index * INDEX_LINE_HEIGHT,
      size: INDEX_FONT_SIZE,
      font,
      color: rgb(0.2, 0.2, 0.22),
    }),
  );
}

async function appendEvidence(
  pack: PdfLibDocument,
  prepared: PreparedEvidence,
): Promise<void> {
  if (prepared.sourcePdf) {
    const pages = await pack.copyPages(
      prepared.sourcePdf,
      prepared.sourcePdf.getPageIndices(),
    );
    pages.forEach((page) => pack.addPage(page));
    return;
  }

  const image =
    prepared.file.metadata.mimeType === "image/png"
      ? await pack.embedPng(prepared.file.bytes)
      : await pack.embedJpg(prepared.file.bytes);
  const availableWidth = A4_WIDTH - EVIDENCE_MARGIN * 2;
  const availableHeight = A4_HEIGHT - EVIDENCE_MARGIN * 2 - 12;
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

function addPageNumbers(
  pack: PdfLibDocument,
  font: PDFFont,
  rgb: typeof import("pdf-lib").rgb,
): void {
  const pages = pack.getPages();
  pages.forEach((page, index) => {
    const label = `Page ${index + 1} of ${pages.length}`;
    const size = 7;
    const width = font.widthOfTextAtSize(label, size);
    const { width: pageWidth } = page.getSize();
    const x = Math.max(8, (pageWidth - width) / 2);
    page.drawRectangle({
      x: x - 4,
      y: 5,
      width: width + 8,
      height: 12,
      color: rgb(1, 1, 1),
      opacity: 0.88,
    });
    page.drawText(label, {
      x,
      y: 8,
      size,
      font,
      color: rgb(0.35, 0.35, 0.38),
    });
  });
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

function formatMonth(month: string): string {
  const [yearText, monthText] = month.split("-");
  const year = Number(yearText);
  const monthNumber = Number(monthText);
  const label = MONTH_NAMES[monthNumber - 1];
  return label && Number.isInteger(year) ? `${label} ${year}` : month;
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
