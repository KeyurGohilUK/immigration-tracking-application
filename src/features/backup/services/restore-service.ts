import {
  DATABASE_STORES,
  openAppDatabase,
} from "../../../infrastructure/storage/app-database";
import { encryptRecord } from "../../../infrastructure/storage/encrypted-record-store";
import { base64ToBytes } from "../../../shared/encoding/base64";
import { createEncryptedDocumentRecord } from "../../documents/data/document-repository";
import { HOUSEHOLD_MEMBERS_RECORD_KEY } from "../../household/data/household-member-repository";
import type { BackupData } from "../domain/backup";

export interface BackupSummary {
  people: number;
  permissions: number;
  trips: number;
  documents: number;
  addresses: number;
  lifeEnglishRecords: number;
  includesDocuments: boolean;
}

export function summariseBackup(data: BackupData): BackupSummary {
  return {
    people: data.members.length,
    permissions: data.permissions.reduce(
      (total, { records }) => total + records.length,
      0,
    ),
    trips: data.trips.reduce((total, { records }) => total + records.length, 0),
    documents: data.documents?.length ?? 0,
    addresses: data.addressHistory.reduce(
      (total, { records }) => total + records.length,
      0,
    ),
    lifeEnglishRecords: data.lifeEnglish.reduce(
      (total, { records }) => total + records.length,
      0,
    ),
    includesDocuments: data.documents !== undefined,
  };
}

export async function replaceAllLocalData(
  data: BackupData,
  vaultKey: CryptoKey,
): Promise<void> {
  const [members, permissions, trips, addressHistory, lifeEnglish, documents] =
    await Promise.all([
      encryptRecord(data.members, vaultKey),
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
      Promise.all(
        data.addressHistory.map(async ({ profileId, records }) => ({
          profileId,
          encrypted: await encryptRecord(records, vaultKey),
        })),
      ),
      Promise.all(
        data.lifeEnglish.map(async ({ profileId, records }) => ({
          profileId,
          encrypted: await encryptRecord(records, vaultKey),
        })),
      ),
      data.documents === undefined
        ? Promise.resolve(undefined)
        : Promise.all(
            data.documents.map(async ({ metadata, content }) => ({
              id: metadata.id,
              encrypted: await createEncryptedDocumentRecord(
                metadata,
                base64ToBytes(content),
                vaultKey,
              ),
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
        DATABASE_STORES.addressHistory,
        DATABASE_STORES.lifeEnglish,
        ...(documents ? [DATABASE_STORES.documents] : []),
      ],
      "readwrite",
    );
    const profileStore = transaction.objectStore(DATABASE_STORES.profiles);
    const permissionStore = transaction.objectStore(
      DATABASE_STORES.permissions,
    );
    const tripStore = transaction.objectStore(DATABASE_STORES.trips);
    const addressHistoryStore = transaction.objectStore(
      DATABASE_STORES.addressHistory,
    );
    const lifeEnglishStore = transaction.objectStore(
      DATABASE_STORES.lifeEnglish,
    );
    const documentStore = documents
      ? transaction.objectStore(DATABASE_STORES.documents)
      : null;
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
      addressHistoryStore.clear();
      lifeEnglishStore.clear();
      documentStore?.clear();
      profileStore.put(members, HOUSEHOLD_MEMBERS_RECORD_KEY);
      for (const item of permissions)
        permissionStore.put(item.encrypted, item.profileId);
      for (const item of trips) tripStore.put(item.encrypted, item.profileId);
      for (const item of addressHistory)
        addressHistoryStore.put(item.encrypted, item.profileId);
      for (const item of lifeEnglish)
        lifeEnglishStore.put(item.encrypted, item.profileId);
      for (const item of documents ?? [])
        documentStore?.put(item.encrypted, item.id);
    } catch {
      transaction.abort();
    }
  });
}
