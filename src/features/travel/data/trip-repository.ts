import { DATABASE_STORES } from "../../../infrastructure/storage/app-database";
import {
  getEncryptedRecord,
  saveEncryptedRecord,
} from "../../../infrastructure/storage/encrypted-record-store";
import { isTripCollection, type Trip } from "../domain/trip";

export async function getTrips(
  profileId: string,
  key: CryptoKey,
): Promise<Trip[]> {
  const value = await getEncryptedRecord(DATABASE_STORES.trips, profileId, key);
  if (value === null) return [];
  if (!isTripCollection(value, profileId))
    throw new Error("Decrypted trips are invalid.");
  return value;
}

export async function saveTrips(
  profileId: string,
  trips: Trip[],
  key: CryptoKey,
): Promise<void> {
  if (!isTripCollection(trips, profileId))
    throw new Error("Trips are invalid.");
  await saveEncryptedRecord(DATABASE_STORES.trips, profileId, trips, key);
}
