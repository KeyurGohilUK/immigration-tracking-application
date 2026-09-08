import { DATABASE_STORES } from "../../../infrastructure/storage/app-database";
import { getEncryptedRecord, saveEncryptedRecord } from "../../../infrastructure/storage/encrypted-record-store";
import { isEmploymentCollection, type EmploymentRecord } from "../domain/employment";

export async function getEmploymentRecord(profileId: string, key: CryptoKey): Promise<EmploymentRecord | null> {
  const value = await getEncryptedRecord(DATABASE_STORES.employment, profileId, key);
  if (value === null) return null;
  if (!isEmploymentCollection(value, profileId)) throw new Error("Decrypted employment data is invalid.");
  return value[0] ?? null;
}

export async function saveEmploymentRecord(profileId: string, record: EmploymentRecord, key: CryptoKey): Promise<void> {
  if (!isEmploymentCollection([record], profileId)) throw new Error("Employment data is invalid.");
  await saveEncryptedRecord(DATABASE_STORES.employment, profileId, [record], key);
}
