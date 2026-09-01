import { APP_VERSION } from "../../../configuration/release-metadata";
import { DATA_SCHEMA_VERSION } from "../../../configuration/app-metadata";
import { bytesToHex, hexToBytes } from "../../../shared/encoding/hex";
import { bytesToBase64 } from "../../../shared/encoding/base64";
import {
  getAllDocumentMetadata,
  getDocumentFile,
} from "../../documents/data/document-repository";
import { getHouseholdMembers } from "../../household/data/household-member-repository";
import { getImmigrationPermissions } from "../../immigration/data/immigration-permission-repository";
import { getTrips } from "../../travel/data/trip-repository";
import { getAddressHistory } from "../../documents/data/address-history-repository";
import {
  BACKUP_FORMAT,
  BACKUP_KEY_DERIVATION_ITERATIONS,
  BACKUP_VERSION,
  isBackupPayload,
  isEncryptedBackupFile,
  MAXIMUM_BACKUP_FILE_BYTES,
  type BackupData,
  type BackupPayload,
  type EncryptedBackupFile,
  validateBackupPassword,
} from "../domain/backup";

async function deriveBackupKey(
  password: string,
  salt: Uint8Array<ArrayBuffer>,
): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(password),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt,
      iterations: BACKUP_KEY_DERIVATION_ITERATIONS,
    },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export async function collectBackupData(
  vaultKey: CryptoKey,
): Promise<BackupData> {
  const members = await getHouseholdMembers(vaultKey);
  const profileIds = members.map(({ id }) => id);
  const [permissions, trips, addressHistory, documentMetadata] =
    await Promise.all([
      Promise.all(
        profileIds.map(async (profileId) => ({
          profileId,
          records: await getImmigrationPermissions(profileId, vaultKey),
        })),
      ),
      Promise.all(
        profileIds.map(async (profileId) => ({
          profileId,
          records: await getTrips(profileId, vaultKey),
        })),
      ),
      Promise.all(
        profileIds.map(async (profileId) => ({
          profileId,
          records: await getAddressHistory(profileId, vaultKey),
        })),
      ),
      getAllDocumentMetadata(vaultKey),
    ]);
  const documents = await Promise.all(
    documentMetadata.map(async ({ id }) => {
      const document = await getDocumentFile(id, vaultKey);
      return {
        metadata: document.metadata,
        content: bytesToBase64(document.bytes),
      };
    }),
  );
  return { members, permissions, trips, addressHistory, documents };
}

export async function createEncryptedBackup(
  data: BackupData,
  password: string,
  exportedAt = new Date().toISOString(),
): Promise<EncryptedBackupFile> {
  const passwordError = validateBackupPassword(password, password);
  if (passwordError) throw new Error(passwordError);
  const payload: BackupPayload = {
    format: "urbanfox-ilr-backup-payload",
    version: 1,
    dataSchemaVersion: DATA_SCHEMA_VERSION,
    appVersion: APP_VERSION,
    exportedAt,
    data,
  };
  if (!isBackupPayload(payload))
    throw new Error("The local records are not valid for backup.");
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const initializationVector = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveBackupKey(password, salt);
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: initializationVector },
    key,
    new TextEncoder().encode(JSON.stringify(payload)),
  );
  return {
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    appVersion: APP_VERSION,
    dataSchemaVersion: DATA_SCHEMA_VERSION,
    exportedAt,
    encryption: {
      algorithm: "AES-GCM-256",
      keyDerivation: "PBKDF2-HMAC-SHA-256",
      iterations: BACKUP_KEY_DERIVATION_ITERATIONS,
      salt: bytesToHex(salt),
      initializationVector: bytesToHex(initializationVector),
    },
    ciphertext: bytesToHex(new Uint8Array(encrypted)),
  };
}

export async function decryptAndValidateBackup(
  backup: EncryptedBackupFile,
  password: string,
): Promise<BackupPayload> {
  if (!isEncryptedBackupFile(backup))
    throw new Error("The backup file format is not supported.");
  const key = await deriveBackupKey(
    password,
    hexToBytes(backup.encryption.salt),
  );
  const decrypted = await crypto.subtle.decrypt(
    {
      name: "AES-GCM",
      iv: hexToBytes(backup.encryption.initializationVector),
    },
    key,
    hexToBytes(backup.ciphertext),
  );
  const value: unknown = JSON.parse(new TextDecoder().decode(decrypted));
  if (!isBackupPayload(value))
    throw new Error("The decrypted backup data is invalid.");
  if (
    value.appVersion !== backup.appVersion ||
    value.dataSchemaVersion !== backup.dataSchemaVersion ||
    value.exportedAt !== backup.exportedAt
  )
    throw new Error("The backup metadata does not match its encrypted data.");
  return value;
}

export function parseEncryptedBackupFile(
  contents: string,
): EncryptedBackupFile {
  if (new TextEncoder().encode(contents).byteLength > MAXIMUM_BACKUP_FILE_BYTES)
    throw new Error("The backup file is too large.");
  let value: unknown;
  try {
    value = JSON.parse(contents);
  } catch {
    throw new Error("The backup file is not valid JSON.");
  }
  if (!isEncryptedBackupFile(value))
    throw new Error("The backup file format is not supported.");
  return value;
}

export function downloadBackupFile(backup: EncryptedBackupFile): void {
  const date = backup.exportedAt.slice(0, 10);
  const blob = new Blob([JSON.stringify(backup, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `urbanfox-ilr-backup-${date}.json`;
  link.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 0);
}
