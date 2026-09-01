import { DATA_SCHEMA_VERSION } from "../../../configuration/app-metadata";
import {
  isHouseholdMemberCollection,
  type HouseholdMember,
} from "../../household/domain/household-member";
import {
  isImmigrationPermissionCollection,
  type ImmigrationPermission,
} from "../../immigration/domain/immigration-permission";
import { isTripCollection, type Trip } from "../../travel/domain/trip";
import {
  isAddressHistoryCollection,
  type AddressHistoryEntry,
} from "../../documents/domain/address-history";
import {
  isDocumentMetadata,
  MAXIMUM_TOTAL_DOCUMENT_BYTES,
  type DocumentMetadata,
} from "../../documents/domain/document";

export const BACKUP_FORMAT = "urbanfox-ilr-encrypted-backup";
export const BACKUP_VERSION = 1;
export const BACKUP_PASSWORD_MINIMUM_LENGTH = 12;
export const BACKUP_KEY_DERIVATION_ITERATIONS = 600_000;
export const MAXIMUM_BACKUP_FILE_BYTES = 140 * 1024 * 1024;

export interface BackupDocument {
  metadata: DocumentMetadata;
  content: string;
}

export interface ProfileRecords<T> {
  profileId: string;
  records: T[];
}

export interface BackupData {
  members: HouseholdMember[];
  permissions: ProfileRecords<ImmigrationPermission>[];
  trips: ProfileRecords<Trip>[];
  addressHistory: ProfileRecords<AddressHistoryEntry>[];
  documents?: BackupDocument[];
}

export interface BackupPayload {
  format: "urbanfox-ilr-backup-payload";
  version: 1;
  dataSchemaVersion: number;
  appVersion: string;
  exportedAt: string;
  data: BackupData;
}

export interface EncryptedBackupFile {
  format: typeof BACKUP_FORMAT;
  version: typeof BACKUP_VERSION;
  appVersion: string;
  dataSchemaVersion: number;
  exportedAt: string;
  encryption: {
    algorithm: "AES-GCM-256";
    keyDerivation: "PBKDF2-HMAC-SHA-256";
    iterations: number;
    salt: string;
    initializationVector: string;
  };
  ciphertext: string;
}

export function validateBackupPassword(
  password: string,
  confirmation: string,
): string | null {
  if (password.length < BACKUP_PASSWORD_MINIMUM_LENGTH)
    return `Use at least ${BACKUP_PASSWORD_MINIMUM_LENGTH} characters for the backup password.`;
  if (password !== confirmation) return "The backup passwords do not match.";
  return null;
}

function isIsoTimestamp(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value) &&
    !Number.isNaN(Date.parse(value))
  );
}

function isHexOfLength(value: unknown, bytes: number): value is string {
  return (
    typeof value === "string" &&
    value.length === bytes * 2 &&
    /^[0-9a-f]+$/i.test(value)
  );
}

function isBackupDocument(
  value: unknown,
  profileIds: string[],
): value is BackupDocument {
  if (!value || typeof value !== "object") return false;
  const document = value as Partial<BackupDocument>;
  if (
    !isDocumentMetadata(document.metadata) ||
    !profileIds.includes(document.metadata.profileId) ||
    typeof document.content !== "string" ||
    !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(
      document.content,
    )
  )
    return false;
  const padding = document.content.endsWith("==")
    ? 2
    : document.content.endsWith("=")
      ? 1
      : 0;
  return (document.content.length * 3) / 4 - padding === document.metadata.size;
}

export function isEncryptedBackupFile(
  value: unknown,
): value is EncryptedBackupFile {
  if (!value || typeof value !== "object") return false;
  const backup = value as Partial<EncryptedBackupFile>;
  const encryption = backup.encryption;
  return (
    backup.format === BACKUP_FORMAT &&
    backup.version === BACKUP_VERSION &&
    typeof backup.appVersion === "string" &&
    /^\d+\.\d+\.\d+$/.test(backup.appVersion) &&
    backup.dataSchemaVersion === DATA_SCHEMA_VERSION &&
    isIsoTimestamp(backup.exportedAt) &&
    !!encryption &&
    encryption.algorithm === "AES-GCM-256" &&
    encryption.keyDerivation === "PBKDF2-HMAC-SHA-256" &&
    encryption.iterations === BACKUP_KEY_DERIVATION_ITERATIONS &&
    isHexOfLength(encryption.salt, 16) &&
    isHexOfLength(encryption.initializationVector, 12) &&
    typeof backup.ciphertext === "string" &&
    backup.ciphertext.length >= 32 &&
    backup.ciphertext.length % 2 === 0 &&
    /^[0-9a-f]+$/i.test(backup.ciphertext)
  );
}

function hasExactlyExpectedProfiles<T>(
  value: unknown,
  profileIds: string[],
  validateRecords: (records: unknown, profileId: string) => records is T[],
): value is ProfileRecords<T>[] {
  if (!Array.isArray(value) || value.length !== profileIds.length) return false;
  const expected = new Set(profileIds);
  const found = new Set<string>();
  for (const item of value) {
    if (!item || typeof item !== "object") return false;
    const candidate = item as Partial<ProfileRecords<T>>;
    if (
      typeof candidate.profileId !== "string" ||
      !expected.has(candidate.profileId) ||
      found.has(candidate.profileId) ||
      !validateRecords(candidate.records, candidate.profileId)
    )
      return false;
    found.add(candidate.profileId);
  }
  return true;
}

export function isBackupPayload(value: unknown): value is BackupPayload {
  if (!value || typeof value !== "object") return false;
  const payload = value as Partial<BackupPayload>;
  if (
    payload.format !== "urbanfox-ilr-backup-payload" ||
    payload.version !== 1 ||
    payload.dataSchemaVersion !== DATA_SCHEMA_VERSION ||
    typeof payload.appVersion !== "string" ||
    !/^\d+\.\d+\.\d+$/.test(payload.appVersion) ||
    !isIsoTimestamp(payload.exportedAt) ||
    !payload.data ||
    !isHouseholdMemberCollection(payload.data.members) ||
    payload.data.members.length === 0
  )
    return false;
  const profileIds = payload.data.members.map(({ id }) => id);
  if (new Set(profileIds).size !== profileIds.length) return false;
  const documents = payload.data.documents;
  const documentsAreValid =
    documents === undefined ||
    (Array.isArray(documents) &&
      documents.length <= profileIds.length * 25 &&
      documents.every((document) => isBackupDocument(document, profileIds)) &&
      new Set(documents.map(({ metadata }) => metadata.id)).size ===
        documents.length &&
      documents.reduce(
        (total, document) => total + document.metadata.size,
        0,
      ) <= MAXIMUM_TOTAL_DOCUMENT_BYTES);
  return (
    hasExactlyExpectedProfiles(
      payload.data.permissions,
      profileIds,
      isImmigrationPermissionCollection,
    ) &&
    hasExactlyExpectedProfiles(
      payload.data.trips,
      profileIds,
      isTripCollection,
    ) &&
    hasExactlyExpectedProfiles(
      payload.data.addressHistory,
      profileIds,
      isAddressHistoryCollection,
    ) &&
    documentsAreValid
  );
}
