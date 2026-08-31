import {
  isHouseholdMemberCollection,
  type HouseholdMember,
} from "../domain/household-member";
import {
  getEncryptedRecord,
  saveEncryptedRecord,
} from "../../../infrastructure/storage/encrypted-record-store";
import { DATABASE_STORES } from "../../../infrastructure/storage/app-database";

export const HOUSEHOLD_MEMBERS_RECORD_KEY = "household-members";

export async function getHouseholdMembers(
  key: CryptoKey,
): Promise<HouseholdMember[]> {
  const value = await getEncryptedRecord(
    DATABASE_STORES.profiles,
    HOUSEHOLD_MEMBERS_RECORD_KEY,
    key,
  );
  if (value === null) return [];
  if (!isHouseholdMemberCollection(value))
    throw new Error("Decrypted household members are invalid.");
  return value;
}

export async function saveHouseholdMembers(
  members: HouseholdMember[],
  key: CryptoKey,
): Promise<void> {
  if (!isHouseholdMemberCollection(members) || members.length === 0)
    throw new Error("Household members are invalid.");
  await saveEncryptedRecord(
    DATABASE_STORES.profiles,
    HOUSEHOLD_MEMBERS_RECORD_KEY,
    members,
    key,
  );
}
