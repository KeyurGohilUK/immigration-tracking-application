import { describe, expect, it } from "vitest";
import { DATA_SCHEMA_VERSION } from "../../../configuration/app-metadata";
import { migrateBackupPayload } from "./backup-migration";

const timestamp = "2026-08-30T10:00:00.000Z";

const owner = {
  version: 1,
  id: "owner",
  fullName: "Legacy Owner",
  dateOfBirth: "1990-01-01",
  createdAt: timestamp,
  updatedAt: timestamp,
};

const member = {
  version: 1,
  id: "member-1",
  fullName: "Legacy Member",
  dateOfBirth: "1992-02-02",
  relationship: "spouse-or-partner",
  immigrationRole: "dependant",
  createdAt: timestamp,
  updatedAt: timestamp,
};

const currentMember = {
  version: 1,
  id: "member-1",
  fullName: "Legacy Member",
  dateOfBirth: "1992-02-02",
  immigrationRole: "dependant",
  createdAt: timestamp,
  updatedAt: timestamp,
};

function payload(schemaVersion: number, data: unknown) {
  return {
    format: "urbanfox-ilr-backup-payload",
    version: 1,
    dataSchemaVersion: schemaVersion,
    appVersion: "0.7.0",
    exportedAt: "2026-08-30T12:00:00.000Z",
    data,
  };
}

describe("legacy backup migration", () => {
  it("migrates schema 4 owner and family records into household members", () => {
    const migrated = migrateBackupPayload(
      payload(4, {
        owner,
        familyMembers: [member],
        permissions: [
          { profileId: "owner", records: [] },
          { profileId: "member-1", records: [] },
        ],
        trips: [
          { profileId: "owner", records: [] },
          { profileId: "member-1", records: [] },
        ],
      }),
      4,
    );

    expect(migrated?.dataSchemaVersion).toBe(DATA_SCHEMA_VERSION);
    expect(migrated?.data.members).toEqual([
      { ...owner, immigrationRole: "not-set" },
      {
        version: 1,
        id: "member-1",
        fullName: "Legacy Member",
        dateOfBirth: "1992-02-02",
        immigrationRole: "dependant",
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    ]);
    expect(migrated?.data.addressHistory).toEqual([
      { profileId: "owner", records: [] },
      { profileId: "member-1", records: [] },
    ]);
    expect(migrated?.data.lifeEnglish).toEqual([
      { profileId: "owner", records: [] },
      { profileId: "member-1", records: [] },
    ]);
  });

  for (const schemaVersion of [5, 6] as const) {
    it(`migrates schema ${schemaVersion} by adding newer empty collections`, () => {
      const migrated = migrateBackupPayload(
        payload(schemaVersion, {
          members: [currentMember],
          permissions: [{ profileId: "member-1", records: [] }],
          trips: [{ profileId: "member-1", records: [] }],
        }),
        schemaVersion,
      );

      expect(migrated?.dataSchemaVersion).toBe(DATA_SCHEMA_VERSION);
      expect(migrated?.data.addressHistory).toEqual([
        { profileId: "member-1", records: [] },
      ]);
      expect(migrated?.data.lifeEnglish).toEqual([
        { profileId: "member-1", records: [] },
      ]);
    });
  }

  it("migrates schema 7 backups created before Life/English was added", () => {
    const migrated = migrateBackupPayload(
      payload(7, {
        members: [currentMember],
        permissions: [{ profileId: "member-1", records: [] }],
        trips: [{ profileId: "member-1", records: [] }],
        addressHistory: [{ profileId: "member-1", records: [] }],
      }),
      7,
    );

    expect(migrated?.dataSchemaVersion).toBe(DATA_SCHEMA_VERSION);
    expect(migrated?.data.lifeEnglish).toEqual([
      { profileId: "member-1", records: [] },
    ]);
  });

  it("preserves current schema 7 Life/English records", () => {
    const record = {
      version: 1,
      profileId: "member-1",
      lifeInUkStatus: "passed",
      lifeInUkPassedDate: "2026-08-20",
      lifeInUkReference: "LIFE-123",
      englishStatus: "met",
      englishEvidenceType: "Approved qualification",
      englishReference: "ENG-123",
      notes: "",
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    const migrated = migrateBackupPayload(
      payload(7, {
        members: [currentMember],
        permissions: [{ profileId: "member-1", records: [] }],
        trips: [{ profileId: "member-1", records: [] }],
        addressHistory: [{ profileId: "member-1", records: [] }],
        lifeEnglish: [{ profileId: "member-1", records: [record] }],
      }),
      7,
    );

    expect(migrated?.data.lifeEnglish[0]?.records).toEqual([record]);
  });

  it("rejects pre-backup and future schema versions", () => {
    expect(migrateBackupPayload(payload(3, {}), 3)).toBeNull();
    expect(migrateBackupPayload(payload(8, {}), 8)).toBeNull();
  });

  it("rejects mismatched encrypted payload schema metadata", () => {
    expect(
      migrateBackupPayload(
        payload(5, {
          members: [currentMember],
          permissions: [{ profileId: "member-1", records: [] }],
          trips: [{ profileId: "member-1", records: [] }],
        }),
        6,
      ),
    ).toBeNull();
  });
});
