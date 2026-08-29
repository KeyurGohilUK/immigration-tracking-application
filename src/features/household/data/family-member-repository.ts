import {
  isFamilyMemberCollection,
  type FamilyMember,
} from "../domain/family-member";
import {
  getEncryptedRecord,
  saveEncryptedRecord,
} from "../../../infrastructure/storage/encrypted-record-store";
import { DATABASE_STORES } from "../../../infrastructure/storage/app-database";

const FAMILY_MEMBERS_KEY = "family-members";

export async function getFamilyMembers(
  key: CryptoKey,
): Promise<FamilyMember[]> {
  const value = await getEncryptedRecord(
    DATABASE_STORES.profiles,
    FAMILY_MEMBERS_KEY,
    key,
  );
  if (value === null) return [];
  if (!isFamilyMemberCollection(value))
    throw new Error("Decrypted family profiles are invalid.");
  return value;
}

export async function saveFamilyMembers(
  members: FamilyMember[],
  key: CryptoKey,
): Promise<void> {
  if (!isFamilyMemberCollection(members))
    throw new Error("Family profiles are invalid.");
  await saveEncryptedRecord(
    DATABASE_STORES.profiles,
    FAMILY_MEMBERS_KEY,
    members,
    key,
  );
}
