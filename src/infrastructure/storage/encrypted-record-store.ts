import { bytesToHex, hexToBytes } from "../../shared/encoding/hex";
import { openAppDatabase, type AppDatabaseStore } from "./app-database";
import { toStorageFailure } from "./storage-error";
import { waitForTransaction } from "./storage-transaction";

export interface EncryptedRecord {
  version: 1;
  initializationVector: string;
  ciphertext: string;
}

export function isEncryptedRecord(value: unknown): value is EncryptedRecord {
  if (!value || typeof value !== "object") return false;
  const record = value as Partial<EncryptedRecord>;
  return (
    record.version === 1 &&
    typeof record.initializationVector === "string" &&
    /^[0-9a-f]{24}$/i.test(record.initializationVector) &&
    typeof record.ciphertext === "string" &&
    record.ciphertext.length >= 32 &&
    record.ciphertext.length % 2 === 0 &&
    /^[0-9a-f]+$/i.test(record.ciphertext)
  );
}

export async function encryptRecord(
  value: unknown,
  key: CryptoKey,
): Promise<EncryptedRecord> {
  const initializationVector = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: initializationVector },
    key,
    new TextEncoder().encode(JSON.stringify(value)),
  );
  return {
    version: 1,
    initializationVector: bytesToHex(initializationVector),
    ciphertext: bytesToHex(new Uint8Array(encrypted)),
  };
}

export async function saveEncryptedRecord(
  storeName: AppDatabaseStore,
  recordKey: string,
  value: unknown,
  key: CryptoKey,
): Promise<void> {
  const record = await encryptRecord(value, key);
  const database = await openAppDatabase();
  try {
    const transaction = database.transaction(storeName, "readwrite");
    transaction.objectStore(storeName).put(record, recordKey);
    await waitForTransaction(transaction, database, "write");
  } catch (error) {
    database.close();
    throw toStorageFailure(
      error,
      "write-failed",
      "Encrypted local data could not be saved.",
    );
  }
}

export async function decryptRecord(
  record: EncryptedRecord,
  key: CryptoKey,
): Promise<unknown> {
  if (!isEncryptedRecord(record))
    throw new Error("Encrypted local data is invalid.");
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: hexToBytes(record.initializationVector) },
    key,
    hexToBytes(record.ciphertext),
  );
  return JSON.parse(new TextDecoder().decode(decrypted)) as unknown;
}

export async function getEncryptedRecord(
  storeName: AppDatabaseStore,
  recordKey: string,
  key: CryptoKey,
): Promise<unknown | null> {
  const database = await openAppDatabase();
  let record: EncryptedRecord | null = null;
  try {
    const transaction = database.transaction(storeName, "readonly");
    const request = transaction.objectStore(storeName).get(recordKey);
    record = await new Promise<EncryptedRecord | null>((resolve, reject) => {
      request.onsuccess = () =>
        resolve((request.result as EncryptedRecord | undefined) ?? null);
      request.onerror = () =>
        reject(
          toStorageFailure(
            request.error,
            "read-failed",
            "Encrypted local data could not be read.",
          ),
        );
    });
    await waitForTransaction(transaction, database, "read");
  } catch (error) {
    database.close();
    throw toStorageFailure(
      error,
      "read-failed",
      "Encrypted local data could not be read.",
    );
  }
  if (!record) return null;
  return decryptRecord(record, key);
}
