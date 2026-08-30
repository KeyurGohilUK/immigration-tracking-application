import type { FamilyMember } from "../../household/domain/family-member";
import type { OwnerProfile } from "../../household/domain/owner-profile";
import type { ImmigrationPermission } from "../../immigration/domain/immigration-permission";
import type { Trip } from "../../travel/domain/trip";

export const BACKUP_FORMAT = "urbanfox-ilr-encrypted-backup";
export const BACKUP_VERSION = 1;
export const BACKUP_PASSWORD_MINIMUM_LENGTH = 12;

export interface ProfileRecords<T> {
  profileId: string;
  records: T[];
}

export interface BackupData {
  owner: OwnerProfile;
  familyMembers: FamilyMember[];
  permissions: ProfileRecords<ImmigrationPermission>[];
  trips: ProfileRecords<Trip>[];
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
