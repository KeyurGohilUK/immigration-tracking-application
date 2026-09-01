import {
  hasValidStoredRecordMetadata,
  isRecordIdentifier,
} from "../../../shared/validation/stored-record";

export const DOCUMENT_CATEGORIES = [
  "passport",
  "immigration-evidence",
  "address-proof",
  "employer-letter",
  "employment-contract",
  "payslip",
  "tax-document",
  "travel-evidence",
  "life-in-uk",
  "english-language",
  "relationship-evidence",
  "application-form",
  "declaration-consent",
  "additional-document",
  "other",
] as const;

export const DOCUMENT_MIME_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
] as const;

export const MAXIMUM_DOCUMENT_BYTES = 5 * 1024 * 1024;
export const MAXIMUM_DOCUMENTS_PER_PROFILE = 25;
export const MAXIMUM_TOTAL_DOCUMENT_BYTES = 50 * 1024 * 1024;

export type DocumentCategory = (typeof DOCUMENT_CATEGORIES)[number];
export type DocumentMimeType = (typeof DOCUMENT_MIME_TYPES)[number];

export interface DocumentMetadata {
  version: 1;
  id: string;
  profileId: string;
  displayName: string;
  fileName: string;
  mimeType: DocumentMimeType;
  size: number;
  category: DocumentCategory;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentUploadInput {
  displayName: string;
  category: DocumentCategory;
  fileName: string;
  mimeType: string;
  size: number;
}

export const DOCUMENT_CATEGORY_LABELS: Record<DocumentCategory, string> = {
  passport: "Passport",
  "immigration-evidence": "Immigration evidence",
  "address-proof": "Address proof",
  "employer-letter": "Employer letter",
  "employment-contract": "Employment contract",
  payslip: "Payslip",
  "tax-document": "Tax document",
  "travel-evidence": "Travel evidence",
  "life-in-uk": "Life in the UK evidence",
  "english-language": "English-language evidence",
  "relationship-evidence": "Relationship evidence",
  "application-form": "Application form",
  "declaration-consent": "Declaration or consent",
  "additional-document": "Additional supporting document",
  other: "Other (legacy)",
};

export function validateDocumentUploadInput(
  input: DocumentUploadInput,
): string | null {
  const displayName = input.displayName.trim();
  if (displayName.length < 1 || displayName.length > 100)
    return "Enter a document name between 1 and 100 characters.";
  const fileName = input.fileName.trim();
  if (fileName.length < 1 || fileName.length > 150)
    return "The file name must be between 1 and 150 characters.";
  if (!DOCUMENT_MIME_TYPES.includes(input.mimeType as DocumentMimeType))
    return "Choose a PDF, JPG, or PNG file.";
  if (!Number.isInteger(input.size) || input.size < 1)
    return "The selected document is empty.";
  if (input.size > MAXIMUM_DOCUMENT_BYTES)
    return "Each document must be 5 MB or smaller.";
  if (!DOCUMENT_CATEGORIES.includes(input.category))
    return "Choose a document category.";
  return null;
}

export function resolveDocumentMimeType(
  fileName: string,
  browserMimeType: string,
): DocumentMimeType | null {
  if (DOCUMENT_MIME_TYPES.includes(browserMimeType as DocumentMimeType))
    return browserMimeType as DocumentMimeType;
  const lowerName = fileName.toLowerCase();
  if (lowerName.endsWith(".pdf")) return "application/pdf";
  if (lowerName.endsWith(".jpg") || lowerName.endsWith(".jpeg"))
    return "image/jpeg";
  if (lowerName.endsWith(".png")) return "image/png";
  return null;
}

export function validateDocumentSignature(
  mimeType: DocumentMimeType,
  bytes: Uint8Array,
): string | null {
  const matches =
    mimeType === "application/pdf"
      ? bytes.length >= 5 &&
        bytes[0] === 0x25 &&
        bytes[1] === 0x50 &&
        bytes[2] === 0x44 &&
        bytes[3] === 0x46 &&
        bytes[4] === 0x2d
      : mimeType === "image/jpeg"
        ? bytes.length >= 3 &&
          bytes[0] === 0xff &&
          bytes[1] === 0xd8 &&
          bytes[2] === 0xff
        : bytes.length >= 8 &&
          bytes[0] === 0x89 &&
          bytes[1] === 0x50 &&
          bytes[2] === 0x4e &&
          bytes[3] === 0x47 &&
          bytes[4] === 0x0d &&
          bytes[5] === 0x0a &&
          bytes[6] === 0x1a &&
          bytes[7] === 0x0a;
  return matches
    ? null
    : "The file contents do not match the selected PDF, JPG, or PNG format.";
}

export function validateDocumentName(name: string): string | null {
  const trimmed = name.trim();
  return trimmed.length >= 1 && trimmed.length <= 100
    ? null
    : "Enter a document name between 1 and 100 characters.";
}

export function isDocumentMetadata(value: unknown): value is DocumentMetadata {
  if (!value || typeof value !== "object") return false;
  const document = value as Partial<DocumentMetadata>;
  return (
    hasValidStoredRecordMetadata(document, 1) &&
    isRecordIdentifier(document.profileId) &&
    typeof document.displayName === "string" &&
    document.displayName === document.displayName.trim() &&
    validateDocumentName(document.displayName) === null &&
    typeof document.fileName === "string" &&
    document.fileName === document.fileName.trim() &&
    document.fileName.length >= 1 &&
    document.fileName.length <= 150 &&
    DOCUMENT_MIME_TYPES.includes(document.mimeType as DocumentMimeType) &&
    Number.isInteger(document.size) &&
    (document.size ?? 0) >= 1 &&
    (document.size ?? 0) <= MAXIMUM_DOCUMENT_BYTES &&
    DOCUMENT_CATEGORIES.includes(document.category as DocumentCategory) &&
    Number.isInteger(document.sortOrder) &&
    (document.sortOrder ?? -1) >= 0 &&
    (document.sortOrder ?? -1) <= MAXIMUM_DOCUMENTS_PER_PROFILE
  );
}

export function formatDocumentBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
