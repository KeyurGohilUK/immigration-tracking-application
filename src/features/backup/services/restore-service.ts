import {
  DATABASE_STORES,
  openAppDatabase,
} from "../../../infrastructure/storage/app-database";
import { encryptRecord } from "../../../infrastructure/storage/encrypted-record-store";
import { FAMILY_MEMBERS_RECORD_KEY } from "../../household/data/family-member-repository";
import { OWNER_PROFILE_RECORD_KEY } from "../../household/data/owner-profile-repository";
import type { BackupData } from "../domain/backup";

export interface BackupSummary {
  ownerName: string;
  people: number;
  permissions: number;
  trips: number;
}

export function summariseBackup(data: BackupData): BackupSummary {
  return {
    ownerName: data.owner.fullName,
    people: data.familyMembers.length + 1,
    permissions: data.permissions.reduce(
      (total, { records }) => total + records.length,
      0,
    ),
    trips: data.trips.reduce((total, { records }) => total + records.length, 0),
  };
}

export async function replaceAllLocalData(
  data: BackupData,
  vaultKey: CryptoKey,
): Promise<void> {
  const [owner, familyMembers, permissions, trips] = await Promise.all([
    encryptRecord(data.owner, vaultKey),
    encryptRecord(data.familyMembers, vaultKey),
    Promise.all(
      data.permissions.map(async ({ profileId, records }) => ({
        profileId,
        encrypted: await encryptRecord(records, vaultKey),
      })),
    ),
    Promise.all(
      data.trips.map(async ({ profileId, records }) => ({
        profileId,
        encrypted: await encryptRecord(records, vaultKey),
      })),
    ),
  ]);
  const database = await openAppDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(
      [
        DATABASE_STORES.profiles,
        DATABASE_STORES.permissions,
        DATABASE_STORES.trips,
      ],
      "readwrite",
    );
    const profileStore = transaction.objectStore(DATABASE_STORES.profiles);
    const permissionStore = transaction.objectStore(
      DATABASE_STORES.permissions,
    );
    const tripStore = transaction.objectStore(DATABASE_STORES.trips);
    transaction.oncomplete = () => {
      database.close();
      resolve();
    };
    transaction.onabort = () => {
      database.close();
      reject(new Error("The restore transaction could not be completed."));
    };
    transaction.onerror = () => {
      // IndexedDB aborts the transaction, preserving the previous records.
    };
    try {
      profileStore.clear();
      permissionStore.clear();
      tripStore.clear();
      profileStore.put(owner, OWNER_PROFILE_RECORD_KEY);
      profileStore.put(familyMembers, FAMILY_MEMBERS_RECORD_KEY);
      for (const item of permissions)
        permissionStore.put(item.encrypted, item.profileId);
      for (const item of trips) tripStore.put(item.encrypted, item.profileId);
    } catch {
      transaction.abort();
    }
  });
}
