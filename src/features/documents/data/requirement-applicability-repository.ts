import { DATABASE_STORES } from "../../../infrastructure/storage/app-database";
import {
  getEncryptedRecord,
  saveEncryptedRecord,
} from "../../../infrastructure/storage/encrypted-record-store";
import {
  isRequirementApplicabilityCollection,
  type RequirementApplicabilityRecord,
} from "../domain/requirement-applicability";

export async function getRequirementApplicability(
  profileId: string,
  key: CryptoKey,
): Promise<RequirementApplicabilityRecord | null> {
  const value = await getEncryptedRecord(
    DATABASE_STORES.requirementApplicability,
    profileId,
    key,
  );
  if (value === null) return null;
  if (!isRequirementApplicabilityCollection(value, profileId))
    throw new Error("Decrypted requirement applicability data is invalid.");
  return value[0] ?? null;
}

export async function saveRequirementApplicability(
  record: RequirementApplicabilityRecord,
  key: CryptoKey,
): Promise<void> {
  if (!isRequirementApplicabilityCollection([record], record.profileId))
    throw new Error("Requirement applicability data is invalid.");
  await saveEncryptedRecord(
    DATABASE_STORES.requirementApplicability,
    record.profileId,
    [record],
    key,
  );
}
