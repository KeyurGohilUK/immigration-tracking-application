import { isOwnerProfile, type OwnerProfile } from "../domain/owner-profile";
import {
  getEncryptedProfileRecord,
  saveEncryptedProfileRecord,
} from "./encrypted-profile-store";

const OWNER_KEY = "owner";

export async function saveOwnerProfile(
  profile: OwnerProfile,
  key: CryptoKey,
): Promise<void> {
  await saveEncryptedProfileRecord(OWNER_KEY, profile, key);
}

export async function getOwnerProfile(
  key: CryptoKey,
): Promise<OwnerProfile | null> {
  const profile = await getEncryptedProfileRecord(OWNER_KEY, key);
  if (profile === null) return null;
  if (!isOwnerProfile(profile))
    throw new Error("Decrypted profile is invalid.");
  return profile;
}
