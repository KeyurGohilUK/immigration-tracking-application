import { isVaultRecord, type VaultRecord } from "../services/vault-crypto";
import {
  DATABASE_STORES,
  openAppDatabase,
} from "../../../infrastructure/storage/app-database";

const SECURITY_STORE = DATABASE_STORES.security;
const VAULT_KEY = "vault";

export async function getVaultRecord(): Promise<VaultRecord | null> {
  const database = await openAppDatabase();
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
  const database = await openAppDatabase();
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
