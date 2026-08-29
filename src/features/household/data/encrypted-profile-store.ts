import {
  DATABASE_STORES,
  openAppDatabase,
} from "../../../infrastructure/storage/app-database";
import {
  bytesToHex,
  hexToBytes,
} from "../../security/services/crypto-encoding";

interface EncryptedProfileRecord {
  version: 1;
  initializationVector: string;
  ciphertext: string;
}

export async function saveEncryptedProfileRecord(
  recordKey: string,
  value: unknown,
  key: CryptoKey,
): Promise<void> {
  const initializationVector = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: initializationVector },
    key,
    new TextEncoder().encode(JSON.stringify(value)),
  );
  const record: EncryptedProfileRecord = {
    version: 1,
    initializationVector: bytesToHex(initializationVector),
    ciphertext: bytesToHex(new Uint8Array(encrypted)),
  };
  const database = await openAppDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(
      DATABASE_STORES.profiles,
      "readwrite",
    );
    transaction.objectStore(DATABASE_STORES.profiles).put(record, recordKey);
    transaction.oncomplete = () => {
      database.close();
      resolve();
    };
    transaction.onerror = () => {
      database.close();
      reject(new Error("Encrypted profile data could not be saved."));
    };
  });
}

export async function getEncryptedProfileRecord(
  recordKey: string,
  key: CryptoKey,
): Promise<unknown | null> {
  const database = await openAppDatabase();
  const record = await new Promise<EncryptedProfileRecord | null>(
    (resolve, reject) => {
      const transaction = database.transaction(
        DATABASE_STORES.profiles,
        "readonly",
      );
      const request = transaction
        .objectStore(DATABASE_STORES.profiles)
        .get(recordKey);
      request.onsuccess = () =>
        resolve((request.result as EncryptedProfileRecord | undefined) ?? null);
      request.onerror = () =>
        reject(new Error("Encrypted profile data could not be read."));
      transaction.oncomplete = () => database.close();
    },
  );
  if (!record) return null;
  if (
    record.version !== 1 ||
    typeof record.initializationVector !== "string" ||
    typeof record.ciphertext !== "string"
  )
    throw new Error("Encrypted profile data is invalid.");
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: hexToBytes(record.initializationVector) },
    key,
    hexToBytes(record.ciphertext),
  );
  return JSON.parse(new TextDecoder().decode(decrypted)) as unknown;
}
