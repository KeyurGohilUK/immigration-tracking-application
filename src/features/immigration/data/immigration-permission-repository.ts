import { DATABASE_STORES } from "../../../infrastructure/storage/app-database";
import {
  getEncryptedRecord,
  saveEncryptedRecord,
} from "../../../infrastructure/storage/encrypted-record-store";
import {
  isImmigrationPermissionCollection,
  type ImmigrationPermission,
} from "../domain/immigration-permission";

export async function getImmigrationPermissions(
  profileId: string,
  key: CryptoKey,
): Promise<ImmigrationPermission[]> {
  const value = await getEncryptedRecord(
    DATABASE_STORES.permissions,
    profileId,
    key,
  );
  if (value === null) return [];
  if (!isImmigrationPermissionCollection(value, profileId))
    throw new Error("Decrypted immigration permissions are invalid.");
  return value;
}

export async function saveImmigrationPermissions(
  profileId: string,
  permissions: ImmigrationPermission[],
  key: CryptoKey,
): Promise<void> {
  if (!isImmigrationPermissionCollection(permissions, profileId))
    throw new Error("Immigration permissions are invalid.");
  await saveEncryptedRecord(
    DATABASE_STORES.permissions,
    profileId,
    permissions,
    key,
  );
}
