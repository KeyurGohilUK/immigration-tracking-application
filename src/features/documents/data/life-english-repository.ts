import { DATABASE_STORES } from "../../../infrastructure/storage/app-database";
import {
  getEncryptedRecord,
  saveEncryptedRecord,
} from "../../../infrastructure/storage/encrypted-record-store";
import {
  isLifeEnglishCollection,
  type LifeEnglishRecord,
} from "../domain/life-english";

export async function getLifeEnglishRecord(
  profileId: string,
  key: CryptoKey,
): Promise<LifeEnglishRecord | null> {
  const value = await getEncryptedRecord(
    DATABASE_STORES.lifeEnglish,
    profileId,
    key,
  );
  if (value === null) return null;
  if (!isLifeEnglishCollection(value, profileId))
    throw new Error("Decrypted Life in the UK and English data is invalid.");
  return value[0] ?? null;
}

export async function saveLifeEnglishRecord(
  profileId: string,
  record: LifeEnglishRecord,
  key: CryptoKey,
): Promise<void> {
  if (!isLifeEnglishCollection([record], profileId))
    throw new Error("Life in the UK and English data is invalid.");
  await saveEncryptedRecord(
    DATABASE_STORES.lifeEnglish,
    profileId,
    [record],
    key,
  );
}
