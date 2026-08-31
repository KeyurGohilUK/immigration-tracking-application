export const DATABASE_STORES = {
  security: "security",
  profiles: "profiles",
  permissions: "permissions",
  trips: "trips",
  documents: "documents",
} as const;

export type AppDatabaseStore =
  (typeof DATABASE_STORES)[keyof typeof DATABASE_STORES];

const DATABASE_NAME = "urbanfox-ilr";
const DATABASE_VERSION = 6;

export function openAppDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
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
      reject(new Error("Private storage could not be opened."));
  });
}
