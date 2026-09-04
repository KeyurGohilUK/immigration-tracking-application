import { StorageFailure, toStorageFailure } from "./storage-error";

export const DATABASE_STORES = {
  security: "security",
  profiles: "profiles",
  permissions: "permissions",
  trips: "trips",
  documents: "documents",
  addressHistory: "address-history",
  lifeEnglish: "life-english",
} as const;

export type AppDatabaseStore =
  (typeof DATABASE_STORES)[keyof typeof DATABASE_STORES];

const DATABASE_NAME = "urbanfox-ilr";
const DATABASE_VERSION = 8;

export function openAppDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!globalThis.indexedDB) {
      reject(
        new StorageFailure(
          "unavailable",
          "Private storage is unavailable in this browser.",
        ),
      );
      return;
    }

    let request: IDBOpenDBRequest;
    try {
      request = globalThis.indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    } catch (error) {
      reject(
        toStorageFailure(
          error,
          "unavailable",
          "Private storage could not be opened.",
        ),
      );
      return;
    }
    request.onupgradeneeded = (event) => {
      for (const store of Object.values(DATABASE_STORES)) {
        if (!request.result.objectStoreNames.contains(store))
          request.result.createObjectStore(store);
      }
      if ((event.oldVersion ?? 0) > 0 && (event.oldVersion ?? 0) < 6) {
        const transaction = request.transaction;
        transaction?.objectStore(DATABASE_STORES.profiles).clear();
        transaction?.objectStore(DATABASE_STORES.permissions).clear();
        transaction?.objectStore(DATABASE_STORES.trips).clear();
        transaction?.objectStore(DATABASE_STORES.documents).clear();
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(
        toStorageFailure(
          request.error,
          request.transaction ? "migration-failed" : "unavailable",
          request.transaction
            ? "Private storage could not be upgraded safely."
            : "Private storage could not be opened.",
        ),
      );
    request.onblocked = () =>
      reject(
        new StorageFailure(
          "unavailable",
          "Private storage is busy in another app session. Close other UrbanFox ILR tabs and try again.",
        ),
      );
  });
}
