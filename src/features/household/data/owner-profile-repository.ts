import {
  DATABASE_STORES,
  openAppDatabase,
} from "../../../infrastructure/storage/app-database";
import {
  bytesToHex,
  hexToBytes,
} from "../../security/services/crypto-encoding";
import { isOwnerProfile, type OwnerProfile } from "../domain/owner-profile";

interface EncryptedProfile {
  version: 1;
  initializationVector: string;
  ciphertext: string;
}
const OWNER_KEY = "owner";

export async function saveOwnerProfile(
  profile: OwnerProfile,
  key: CryptoKey,
): Promise<void> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(JSON.stringify(profile)),
  );
  const record: EncryptedProfile = {
    version: 1,
    initializationVector: bytesToHex(iv),
    ciphertext: bytesToHex(new Uint8Array(encrypted)),
  };
  const database = await openAppDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(
      DATABASE_STORES.profiles,
      "readwrite",
    );
    transaction.objectStore(DATABASE_STORES.profiles).put(record, OWNER_KEY);
    transaction.oncomplete = () => {
      database.close();
      resolve();
    };
    transaction.onerror = () => {
      database.close();
      reject(new Error("Profile could not be saved."));
    };
  });
}

export async function getOwnerProfile(
  key: CryptoKey,
): Promise<OwnerProfile | null> {
  const database = await openAppDatabase();
  const record = await new Promise<EncryptedProfile | null>(
    (resolve, reject) => {
      const transaction = database.transaction(
        DATABASE_STORES.profiles,
        "readonly",
      );
      const request = transaction
        .objectStore(DATABASE_STORES.profiles)
        .get(OWNER_KEY);
      request.onsuccess = () =>
        resolve((request.result as EncryptedProfile | undefined) ?? null);
      request.onerror = () => reject(new Error("Profile could not be read."));
      transaction.oncomplete = () => database.close();
    },
  );
  if (!record) return null;
  if (
    record.version !== 1 ||
    typeof record.initializationVector !== "string" ||
    typeof record.ciphertext !== "string"
  )
    throw new Error("Encrypted profile is invalid.");
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: hexToBytes(record.initializationVector) },
    key,
    hexToBytes(record.ciphertext),
  );
  const profile: unknown = JSON.parse(new TextDecoder().decode(decrypted));
  if (!isOwnerProfile(profile))
    throw new Error("Decrypted profile is invalid.");
  return profile;
}
