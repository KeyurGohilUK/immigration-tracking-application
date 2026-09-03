import type { DecryptedDocumentFile } from "../data/document-repository";
import type { AddressHistoryEntry } from "../domain/address-history";
import {
  DOCUMENT_VAULT_SECTIONS,
  type DocumentVaultSectionDefinition,
} from "../domain/document-vault";
import {
  buildAddressEvidenceExportPlan,
  createAddressHistoryIndexPdf,
  getAddressHistoryIndexFileName,
} from "./address-evidence-export-service";

interface ZipEntry {
  path: string;
  bytes: Uint8Array<ArrayBuffer>;
  directory?: boolean;
}

export interface DocumentBundlePlanItem {
  path: string;
  documentId?: string;
  generated?: "address-index";
}

export interface DocumentBundlePlan {
  folders: string[];
  items: DocumentBundlePlanItem[];
}

const TEXT_ENCODER = new TextEncoder();

export function buildDocumentBundlePlan(
  documents: readonly DecryptedDocumentFile[],
  addresses: readonly AddressHistoryEntry[],
  profileName: string,
): DocumentBundlePlan {
  const sections = getVisibleSections();
  const folders = sections.map(({ label }) => getSectionFolderName(label));
  const items: DocumentBundlePlanItem[] = [];
  const usedNamesByFolder = new Map<string, Set<string>>();

  const addressSection = sections.find(({ id }) => id === "address-history");
  if (addressSection) {
    const folder = getSectionFolderName(addressSection.label);
    const addressPlan = buildAddressEvidenceExportPlan(
      addresses,
      documents.map(({ metadata }) => metadata),
    );
    if (addresses.length > 0) {
      items.push({
        path: `${folder}/${getAddressHistoryIndexFileName(profileName)}`,
        generated: "address-index",
      });
    }

    const linkedIds = new Set<string>();
    for (const evidence of addressPlan.evidenceFiles) {
      linkedIds.add(evidence.documentId);
      items.push({
        path: `${folder}/${evidence.exportedFileName}`,
        documentId: evidence.documentId,
      });
    }

    const unlinked = documents.filter(
      ({ metadata }) =>
        metadata.category === "address-proof" && !linkedIds.has(metadata.id),
    );
    for (const { metadata } of unlinked) {
      const fileName = getUniqueFileName(
        folder,
        `Unlinked address evidence - ${metadata.fileName}`,
        usedNamesByFolder,
      );
      items.push({
        path: `${folder}/${fileName}`,
        documentId: metadata.id,
      });
    }
  }

  for (const section of sections) {
    if (section.id === "address-history") continue;
    const folder = getSectionFolderName(section.label);
    const categories = new Set(
      section.requirements.flatMap(({ categories }) => [...categories]),
    );
    const sectionDocuments = documents
      .filter(({ metadata }) => categories.has(metadata.category))
      .sort(
        (left, right) =>
          left.metadata.sortOrder - right.metadata.sortOrder ||
          left.metadata.createdAt.localeCompare(right.metadata.createdAt),
      );
    for (const { metadata } of sectionDocuments) {
      const fileName = getUniqueFileName(
        folder,
        metadata.fileName,
        usedNamesByFolder,
      );
      items.push({
        path: `${folder}/${fileName}`,
        documentId: metadata.id,
      });
    }
  }

  return { folders, items };
}

export async function createDocumentBundle(
  documents: readonly DecryptedDocumentFile[],
  addresses: readonly AddressHistoryEntry[],
  profileName: string,
): Promise<Uint8Array<ArrayBuffer>> {
  const plan = buildDocumentBundlePlan(documents, addresses, profileName);
  const filesById = new Map(
    documents.map((file) => [file.metadata.id, file] as const),
  );
  const entries: ZipEntry[] = plan.folders.map((folder) => ({
    path: `${folder}/`,
    bytes: new Uint8Array(),
    directory: true,
  }));

  let addressIndexBytes: Uint8Array<ArrayBuffer> | null = null;
  for (const item of plan.items) {
    if (item.generated === "address-index") {
      addressIndexBytes ??= await createAddressHistoryIndexPdf(
        buildAddressEvidenceExportPlan(
          addresses,
          documents.map(({ metadata }) => metadata),
        ).indexRows,
        profileName,
      );
      entries.push({ path: item.path, bytes: addressIndexBytes });
      continue;
    }

    if (!item.documentId) continue;
    const file = filesById.get(item.documentId);
    if (!file)
      throw new Error("A document selected for the bundle is unavailable.");
    entries.push({ path: item.path, bytes: file.bytes });
  }

  return createStoredZip(entries);
}

export function getDocumentBundleFileName(profileName: string): string {
  const safeName = safeFileStem(profileName || "UrbanFox");
  return `${safeName}-ILR-Document-Bundle.zip`;
}

export function downloadDocumentBundle(
  bytes: Uint8Array<ArrayBuffer>,
  profileName: string,
): void {
  const blob = new Blob([bytes], { type: "application/zip" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = getDocumentBundleFileName(profileName);
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}

function getVisibleSections(): DocumentVaultSectionDefinition[] {
  return DOCUMENT_VAULT_SECTIONS.filter(
    ({ visibleInVault }) => visibleInVault !== false,
  );
}

function getSectionFolderName(label: string): string {
  return sanitizePathPart(label.replace(/\s*\/\s*/g, " & "));
}

function getUniqueFileName(
  folder: string,
  proposed: string,
  usedNamesByFolder: Map<string, Set<string>>,
): string {
  const usedNames = usedNamesByFolder.get(folder) ?? new Set<string>();
  usedNamesByFolder.set(folder, usedNames);
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
  const cleaned = value
    .normalize("NFKD")
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
  return cleaned.slice(0, 180) || "Document";
}

function sanitizePathPart(value: string): string {
  return sanitizeFileName(value).replace(/\.+$/g, "") || "Documents";
}

function safeFileStem(value: string): string {
  return (
    value
      .normalize("NFKD")
      .replace(/[^a-zA-Z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "UrbanFox"
  );
}

function createStoredZip(
  entries: readonly ZipEntry[],
): Uint8Array<ArrayBuffer> {
  const localParts: Uint8Array[] = [];
  const centralParts: Uint8Array[] = [];
  let offset = 0;

  for (const entry of entries) {
    const nameBytes = TEXT_ENCODER.encode(entry.path);
    const crc = entry.directory ? 0 : crc32(entry.bytes);
    const size = entry.bytes.byteLength;
    const local = new Uint8Array(30 + nameBytes.byteLength + size);
    const localView = new DataView(local.buffer);
    localView.setUint32(0, 0x04034b50, true);
    localView.setUint16(4, 20, true);
    localView.setUint16(6, 0x0800, true);
    localView.setUint16(8, 0, true);
    localView.setUint16(10, 0, true);
    localView.setUint16(12, 0, true);
    localView.setUint32(14, crc, true);
    localView.setUint32(18, size, true);
    localView.setUint32(22, size, true);
    localView.setUint16(26, nameBytes.byteLength, true);
    localView.setUint16(28, 0, true);
    local.set(nameBytes, 30);
    local.set(entry.bytes, 30 + nameBytes.byteLength);
    localParts.push(local);

    const central = new Uint8Array(46 + nameBytes.byteLength);
    const centralView = new DataView(central.buffer);
    centralView.setUint32(0, 0x02014b50, true);
    centralView.setUint16(4, 20, true);
    centralView.setUint16(6, 20, true);
    centralView.setUint16(8, 0x0800, true);
    centralView.setUint16(10, 0, true);
    centralView.setUint16(12, 0, true);
    centralView.setUint16(14, 0, true);
    centralView.setUint32(16, crc, true);
    centralView.setUint32(20, size, true);
    centralView.setUint32(24, size, true);
    centralView.setUint16(28, nameBytes.byteLength, true);
    centralView.setUint16(30, 0, true);
    centralView.setUint16(32, 0, true);
    centralView.setUint16(34, 0, true);
    centralView.setUint16(36, 0, true);
    centralView.setUint32(38, entry.directory ? 0x10 : 0, true);
    centralView.setUint32(42, offset, true);
    central.set(nameBytes, 46);
    centralParts.push(central);
    offset += local.byteLength;
  }

  const centralOffset = offset;
  const centralSize = centralParts.reduce(
    (total, part) => total + part.byteLength,
    0,
  );
  const end = new Uint8Array(22);
  const endView = new DataView(end.buffer);
  endView.setUint32(0, 0x06054b50, true);
  endView.setUint16(4, 0, true);
  endView.setUint16(6, 0, true);
  endView.setUint16(8, entries.length, true);
  endView.setUint16(10, entries.length, true);
  endView.setUint32(12, centralSize, true);
  endView.setUint32(16, centralOffset, true);
  endView.setUint16(20, 0, true);

  const totalSize =
    localParts.reduce((total, part) => total + part.byteLength, 0) +
    centralSize +
    end.byteLength;
  const output = new Uint8Array(totalSize);
  let cursor = 0;
  for (const part of [...localParts, ...centralParts, end]) {
    output.set(part, cursor);
    cursor += part.byteLength;
  }
  return output;
}

function crc32(bytes: Uint8Array): number {
  let crc = 0xffffffff;
  for (const byte of bytes) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1)
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
  }
  return (crc ^ 0xffffffff) >>> 0;
}
