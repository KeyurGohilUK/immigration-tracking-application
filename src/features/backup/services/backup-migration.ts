import { DATA_SCHEMA_VERSION } from "../../../configuration/app-metadata";
import {
  isHouseholdMemberCollection,
  type HouseholdMember,
} from "../../household/domain/household-member";
import {
  migrateImmigrationPermissionCollection,
  type ImmigrationPermission,
} from "../../immigration/domain/immigration-permission";
import { isTripCollection, type Trip } from "../../travel/domain/trip";
import {
  isAddressHistoryCollection,
  type AddressHistoryEntry,
} from "../../documents/domain/address-history";
import {
  isLifeEnglishCollection,
  type LifeEnglishRecord,
} from "../../documents/domain/life-english";
import {
  isDocumentMetadata,
  MAXIMUM_TOTAL_DOCUMENT_BYTES,
  type DocumentMetadata,
} from "../../documents/domain/document";
import type {
  BackupData,
  BackupDocument,
  BackupPayload,
  ProfileRecords,
} from "../domain/backup";

export const MINIMUM_SUPPORTED_BACKUP_SCHEMA_VERSION = 4;

function isIsoTimestamp(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value) &&
    !Number.isNaN(Date.parse(value))
  );
}

function isProfileRecords(value: unknown): value is ProfileRecords<unknown>[] {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        !!item &&
        typeof item === "object" &&
        typeof (item as { profileId?: unknown }).profileId === "string" &&
        Array.isArray((item as { records?: unknown }).records),
    )
  );
}

function migratePermissions(
  value: unknown,
  profileIds: readonly string[],
): ProfileRecords<ImmigrationPermission>[] | null {
  if (!isProfileRecords(value) || value.length !== profileIds.length)
    return null;
  const expected = new Set(profileIds);
  const found = new Set<string>();
  const result: ProfileRecords<ImmigrationPermission>[] = [];
  for (const item of value) {
    if (!expected.has(item.profileId) || found.has(item.profileId)) return null;
    const records = migrateImmigrationPermissionCollection(
      item.records,
      item.profileId,
    );
    if (!records) return null;
    found.add(item.profileId);
    result.push({ profileId: item.profileId, records });
  }
  return result;
}

function migrateTrips(
  value: unknown,
  profileIds: readonly string[],
): ProfileRecords<Trip>[] | null {
  if (!isProfileRecords(value) || value.length !== profileIds.length) return null;
  const expected = new Set(profileIds);
  const found = new Set<string>();
  const result: ProfileRecords<Trip>[] = [];
  for (const item of value) {
    if (
      !expected.has(item.profileId) ||
      found.has(item.profileId) ||
      !isTripCollection(item.records, item.profileId)
    )
      return null;
    found.add(item.profileId);
    result.push({ profileId: item.profileId, records: item.records });
  }
  return result;
}

function migrateAddressHistory(
  value: unknown,
  profileIds: readonly string[],
): ProfileRecords<AddressHistoryEntry>[] | null {
  if (value === undefined)
    return profileIds.map((profileId) => ({ profileId, records: [] }));
  if (!isProfileRecords(value) || value.length !== profileIds.length) return null;
  const expected = new Set(profileIds);
  const found = new Set<string>();
  const result: ProfileRecords<AddressHistoryEntry>[] = [];
  for (const item of value) {
    if (
      !expected.has(item.profileId) ||
      found.has(item.profileId) ||
      !isAddressHistoryCollection(item.records, item.profileId)
    )
      return null;
    found.add(item.profileId);
    result.push({ profileId: item.profileId, records: item.records });
  }
  return result;
}

function migrateLifeEnglish(
  value: unknown,
  profileIds: readonly string[],
): ProfileRecords<LifeEnglishRecord>[] | null {
  if (value === undefined)
    return profileIds.map((profileId) => ({ profileId, records: [] }));
  if (!isProfileRecords(value) || value.length !== profileIds.length) return null;
  const expected = new Set(profileIds);
  const found = new Set<string>();
  const result: ProfileRecords<LifeEnglishRecord>[] = [];
  for (const item of value) {
    if (
      !expected.has(item.profileId) ||
      found.has(item.profileId) ||
      !isLifeEnglishCollection(item.records, item.profileId)
    )
      return null;
    found.add(item.profileId);
    result.push({ profileId: item.profileId, records: item.records });
  }
  return result;
}

function migrateDocuments(
  value: unknown,
  profileIds: readonly string[],
): BackupDocument[] | undefined | null {
  if (value === undefined) return undefined;
  if (!Array.isArray(value) || value.length > profileIds.length * 25)
    return null;
  const profileIdSet = new Set(profileIds);
  const ids = new Set<string>();
  let totalBytes = 0;
  const documents: BackupDocument[] = [];
  for (const candidate of value) {
    if (!candidate || typeof candidate !== "object") return null;
    const item = candidate as {
      metadata?: DocumentMetadata;
      content?: unknown;
    };
    if (
      !isDocumentMetadata(item.metadata) ||
      !profileIdSet.has(item.metadata.profileId) ||
      ids.has(item.metadata.id) ||
      typeof item.content !== "string" ||
      !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(
        item.content,
      )
    )
      return null;
    const padding = item.content.endsWith("==")
      ? 2
      : item.content.endsWith("=")
        ? 1
        : 0;
    if ((item.content.length * 3) / 4 - padding !== item.metadata.size)
      return null;
    ids.add(item.metadata.id);
    totalBytes += item.metadata.size;
    documents.push({ metadata: item.metadata, content: item.content });
  }
  return totalBytes <= MAXIMUM_TOTAL_DOCUMENT_BYTES ? documents : null;
}

function migrateSchema4Members(
  data: Record<string, unknown>,
  permissions: ProfileRecords<ImmigrationPermission>[],
): HouseholdMember[] | null {
  const owner = data.owner;
  const familyMembers = data.familyMembers;
  if (
    !owner ||
    typeof owner !== "object" ||
    (owner as { version?: unknown }).version !== 1 ||
    (owner as { id?: unknown }).id !== "owner" ||
    typeof (owner as { fullName?: unknown }).fullName !== "string" ||
    typeof (owner as { dateOfBirth?: unknown }).dateOfBirth !== "string" ||
    typeof (owner as { createdAt?: unknown }).createdAt !== "string" ||
    typeof (owner as { updatedAt?: unknown }).updatedAt !== "string" ||
    !Array.isArray(familyMembers)
  )
    return null;

  const ownerPermission = permissions
    .find(({ profileId }) => profileId === "owner")
    ?.records.at(-1);
  const migrated: HouseholdMember[] = [
    {
      version: 1,
      id: "owner",
      fullName: (owner as { fullName: string }).fullName.trim(),
      dateOfBirth: (owner as { dateOfBirth: string }).dateOfBirth,
      immigrationRole: ownerPermission?.role ?? "not-set",
      createdAt: (owner as { createdAt: string }).createdAt,
      updatedAt: (owner as { updatedAt: string }).updatedAt,
    },
  ];

  for (const value of familyMembers) {
    if (!value || typeof value !== "object") return null;
    const member = value as Record<string, unknown>;
    if (
      member.version !== 1 ||
      typeof member.id !== "string" ||
      typeof member.fullName !== "string" ||
      typeof member.dateOfBirth !== "string" ||
      !["main-applicant", "dependant", "not-set"].includes(
        String(member.immigrationRole),
      ) ||
      typeof member.createdAt !== "string" ||
      typeof member.updatedAt !== "string"
    )
      return null;
    migrated.push({
      version: 1,
      id: member.id,
      fullName: member.fullName.trim(),
      dateOfBirth: member.dateOfBirth,
      immigrationRole:
        member.immigrationRole as HouseholdMember["immigrationRole"],
      createdAt: member.createdAt,
      updatedAt: member.updatedAt,
    });
  }

  return isHouseholdMemberCollection(migrated) ? migrated : null;
}

export function migrateBackupPayload(
  value: unknown,
  schemaVersion: number,
): BackupPayload | null {
  if (
    schemaVersion < MINIMUM_SUPPORTED_BACKUP_SCHEMA_VERSION ||
    schemaVersion > DATA_SCHEMA_VERSION ||
    !value ||
    typeof value !== "object"
  )
    return null;

  const payload = value as Record<string, unknown>;
  if (
    payload.format !== "urbanfox-ilr-backup-payload" ||
    payload.version !== 1 ||
    payload.dataSchemaVersion !== schemaVersion ||
    typeof payload.appVersion !== "string" ||
    !/^\d+\.\d+\.\d+$/.test(payload.appVersion) ||
    !isIsoTimestamp(payload.exportedAt) ||
    !payload.data ||
    typeof payload.data !== "object"
  )
    return null;

  const sourceData = payload.data as Record<string, unknown>;
  let members: HouseholdMember[];
  let profileIds: string[];
  let permissions: ProfileRecords<ImmigrationPermission>[] | null;

  if (schemaVersion === 4) {
    const rawProfileIds = [
      "owner",
      ...(Array.isArray(sourceData.familyMembers)
        ? sourceData.familyMembers
            .map((member) =>
              member && typeof member === "object"
                ? (member as { id?: unknown }).id
                : null,
            )
            .filter((id): id is string => typeof id === "string")
        : []),
    ];
    permissions = migratePermissions(sourceData.permissions, rawProfileIds);
    if (!permissions) return null;
    const migratedMembers = migrateSchema4Members(sourceData, permissions);
    if (!migratedMembers) return null;
    members = migratedMembers;
    profileIds = members.map(({ id }) => id);
  } else {
    if (!isHouseholdMemberCollection(sourceData.members)) return null;
    members = sourceData.members;
    profileIds = members.map(({ id }) => id);
    permissions = migratePermissions(sourceData.permissions, profileIds);
    if (!permissions) return null;
  }

  const trips = migrateTrips(sourceData.trips, profileIds);
  const addressHistory = migrateAddressHistory(
    sourceData.addressHistory,
    profileIds,
  );
  const lifeEnglish = migrateLifeEnglish(sourceData.lifeEnglish, profileIds);
  const documents = migrateDocuments(sourceData.documents, profileIds);
  if (!trips || !addressHistory || !lifeEnglish || documents === null)
    return null;

  const data: BackupData = {
    members,
    permissions,
    trips,
    addressHistory,
    lifeEnglish,
    ...(documents === undefined ? {} : { documents }),
  };

  return {
    format: "urbanfox-ilr-backup-payload",
    version: 1,
    dataSchemaVersion: DATA_SCHEMA_VERSION,
    appVersion: payload.appVersion,
    exportedAt: payload.exportedAt as string,
    data,
  };
}
