import { DATABASE_STORES } from "../../../infrastructure/storage/app-database";
import {
  getEncryptedRecord,
  saveEncryptedRecord,
} from "../../../infrastructure/storage/encrypted-record-store";
import {
  isAddressHistoryCollection,
  validateAddressHistoryCollection,
  type AddressHistoryEntry,
} from "../domain/address-history";

export async function getAddressHistory(
  profileId: string,
  key: CryptoKey,
): Promise<AddressHistoryEntry[]> {
  const value = await getEncryptedRecord(
    DATABASE_STORES.addressHistory,
    profileId,
    key,
  );
  if (value === null) return [];
  if (!isAddressHistoryCollection(value, profileId))
    throw new Error("Decrypted address history is invalid.");
  return value;
}

export async function saveAddressHistory(
  profileId: string,
  entries: AddressHistoryEntry[],
  key: CryptoKey,
): Promise<void> {
  if (!isAddressHistoryCollection(entries, profileId))
    throw new Error("Address history is invalid.");
  const collectionError = validateAddressHistoryCollection(entries);
  if (collectionError) throw new Error(collectionError);
  await saveEncryptedRecord(
    DATABASE_STORES.addressHistory,
    profileId,
    entries,
    key,
  );
}
