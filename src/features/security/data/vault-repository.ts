import { isVaultRecord, type VaultRecord } from "../services/vault-crypto";

const DATABASE_NAME = "urbanfox-ilr";
const DATABASE_VERSION = 1;
const SECURITY_STORE = "security";
const VAULT_KEY = "vault";

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, DATABASE_VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(SECURITY_STORE)) {
        request.result.createObjectStore(SECURITY_STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () =>
      reject(new Error("Private storage could not be opened."));
  });
}

export async function getVaultRecord(): Promise<VaultRecord | null> {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(SECURITY_STORE, "readonly");
    const request = transaction.objectStore(SECURITY_STORE).get(VAULT_KEY);
    request.onsuccess = () => {
      if (request.result === undefined) {
        resolve(null);
        return;
      }
      if (!isVaultRecord(request.result)) {
        reject(new Error("Private storage contains an invalid vault."));
        return;
      }
      resolve(request.result);
    };
    request.onerror = () =>
      reject(new Error("Private storage could not be read."));
    transaction.oncomplete = () => database.close();
  });
}

export async function saveVaultRecord(record: VaultRecord): Promise<void> {
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(SECURITY_STORE, "readwrite");
    transaction.objectStore(SECURITY_STORE).put(record, VAULT_KEY);
    transaction.oncomplete = () => {
      database.close();
      resolve();
    };
    transaction.onerror = () => {
      database.close();
      reject(new Error("Private storage could not be saved."));
    };
  });
}
