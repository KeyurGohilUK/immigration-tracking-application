import { isOwnerProfile, type OwnerProfile } from "../domain/owner-profile";
import {
  getEncryptedRecord,
  saveEncryptedRecord,
} from "../../../infrastructure/storage/encrypted-record-store";
import { DATABASE_STORES } from "../../../infrastructure/storage/app-database";

const OWNER_KEY = "owner";

export async function saveOwnerProfile(
  profile: OwnerProfile,
  key: CryptoKey,
): Promise<void> {
  await saveEncryptedRecord(DATABASE_STORES.profiles, OWNER_KEY, profile, key);
}

export async function getOwnerProfile(
  key: CryptoKey,
): Promise<OwnerProfile | null> {
  const profile = await getEncryptedRecord(
    DATABASE_STORES.profiles,
    OWNER_KEY,
    key,
  );
  if (profile === null) return null;
  if (!isOwnerProfile(profile))
    throw new Error("Decrypted profile is invalid.");
  return profile;
}
