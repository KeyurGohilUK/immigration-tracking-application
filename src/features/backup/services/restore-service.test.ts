import { describe, expect, it } from "vitest";
import type { BackupData } from "../domain/backup";
import { summariseBackup } from "./restore-service";

describe("backup restore summary", () => {
  it("summarises every member record before replacement", () => {
    const data = {
      members: [{ id: "member-1" }, { id: "member-2" }, { id: "member-3" }],
      permissions: [
        { profileId: "member-1", records: [{ id: "permission-1" }] },
        { profileId: "member-2", records: [] },
        { profileId: "member-3", records: [{ id: "permission-2" }] },
      ],
      trips: [
        {
          profileId: "member-1",
          records: [{ id: "trip-1" }, { id: "trip-2" }],
        },
        { profileId: "member-2", records: [] },
        { profileId: "member-3", records: [{ id: "trip-3" }] },
      ],
      addressHistory: [
        { profileId: "member-1", records: [{ id: "address-1" }] },
        { profileId: "member-2", records: [] },
        { profileId: "member-3", records: [] },
      ],
      lifeEnglish: [
        { profileId: "member-1", records: [{ profileId: "member-1" }] },
        { profileId: "member-2", records: [] },
        { profileId: "member-3", records: [] },
      ],
    } as unknown as BackupData;

    expect(summariseBackup(data)).toEqual({
      people: 3,
      permissions: 2,
      trips: 3,
      documents: 0,
      addresses: 1,
      lifeEnglishRecords: 1,
      includesDocuments: false,
    });
  });
});
