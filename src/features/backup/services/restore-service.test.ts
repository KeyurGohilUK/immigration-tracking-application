import { describe, expect, it } from "vitest";
import type { BackupData } from "../domain/backup";
import { summariseBackup } from "./restore-service";

describe("backup restore summary", () => {
  it("summarises every profile record before replacement", () => {
    const data = {
      owner: { fullName: "Backup Owner" },
      familyMembers: [{ id: "family-1" }, { id: "family-2" }],
      permissions: [
        { profileId: "owner", records: [{ id: "permission-1" }] },
        { profileId: "family-1", records: [] },
        { profileId: "family-2", records: [{ id: "permission-2" }] },
      ],
      trips: [
        { profileId: "owner", records: [{ id: "trip-1" }, { id: "trip-2" }] },
        { profileId: "family-1", records: [] },
        { profileId: "family-2", records: [{ id: "trip-3" }] },
      ],
    } as unknown as BackupData;

    expect(summariseBackup(data)).toEqual({
      ownerName: "Backup Owner",
      people: 3,
      permissions: 2,
      trips: 3,
    });
  });
});
