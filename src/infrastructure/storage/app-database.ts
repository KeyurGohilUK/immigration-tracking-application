export const DATABASE_STORES = {
  security: "security",
  profiles: "profiles",
} as const;

const DATABASE_NAME = "urbanfox-ilr";
const DATABASE_VERSION = 2;

export function openAppDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      for (const store of Object.values(DATABASE_STORES)) {
        if (!request.result.objectStoreNames.contains(store))
          request.result.createObjectStore(store);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(new Error("Private storage could not be opened."));
  });
}
