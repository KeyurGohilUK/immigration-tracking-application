import { describe, expect, it } from "vitest";
import type { BackupData } from "../domain/backup";
import {
  createEncryptedBackup,
  decryptAndValidateBackup,
  parseEncryptedBackupFile,
} from "./backup-service";

const backupData: BackupData = {
  members: [
    {
      version: 1,
      id: "member-1",
      fullName: "Encrypted Test Person",
      dateOfBirth: "1990-01-01",
      immigrationRole: "dependant",
      createdAt: "2026-08-30T10:00:00.000Z",
      updatedAt: "2026-08-30T10:00:00.000Z",
    },
  ],
  permissions: [{ profileId: "member-1", records: [] }],
  trips: [{ profileId: "member-1", records: [] }],
  addressHistory: [{ profileId: "member-1", records: [] }],
  lifeEnglish: [{ profileId: "member-1", records: [] }],
};

describe("encrypted backup", () => {
  it("keeps personal data out of the readable backup wrapper", async () => {
    const backup = await createEncryptedBackup(
      backupData,
      "a-secure-backup-password",
      "2026-08-30T12:00:00.000Z",
    );

    expect(JSON.stringify(backup)).not.toContain("Encrypted Test Person");
    expect(backup.encryption.algorithm).toBe("AES-GCM-256");
    expect(backup.encryption.keyDerivation).toBe("PBKDF2-HMAC-SHA-256");
  });

  it("decrypts with the separate backup password", async () => {
    const password = "a-secure-backup-password";
    const backup = await createEncryptedBackup(
      backupData,
      password,
      "2026-08-30T12:00:00.000Z",
    );
    const payload = await decryptAndValidateBackup(backup, password);

    expect(payload.data).toEqual(backupData);
    expect(payload.exportedAt).toBe("2026-08-30T12:00:00.000Z");
  });

  it("encrypts document content and restores it inside the payload", async () => {
    const data: BackupData = {
      ...backupData,
      documents: [
        {
          metadata: {
            version: 1,
            id: "document-1",
            profileId: "member-1",
            displayName: "Passport",
            fileName: "passport.pdf",
            mimeType: "application/pdf",
            size: 5,
            category: "passport",
            sortOrder: 0,
            createdAt: "2026-08-30T10:00:00.000Z",
            updatedAt: "2026-08-30T10:00:00.000Z",
          },
          content: btoa("%PDF-"),
        },
      ],
    };
    const password = "a-secure-backup-password";
    const backup = await createEncryptedBackup(data, password);

    expect(JSON.stringify(backup)).not.toContain("passport.pdf");
    expect((await decryptAndValidateBackup(backup, password)).data).toEqual(
      data,
    );
  });

  it("round-trips multiple household members without mixing profiles", async () => {
    const data: BackupData = {
      ...backupData,
      members: [
        ...backupData.members,
        {
          version: 1,
          id: "member-2",
          fullName: "Second Encrypted Person",
          dateOfBirth: "1992-02-02",
          immigrationRole: "dependant",
          createdAt: "2026-08-30T10:00:00.000Z",
          updatedAt: "2026-08-30T10:00:00.000Z",
        },
      ],
      permissions: [
        ...backupData.permissions,
        { profileId: "member-2", records: [] },
      ],
      trips: [...backupData.trips, { profileId: "member-2", records: [] }],
      addressHistory: [
        ...backupData.addressHistory,
        { profileId: "member-2", records: [] },
      ],
      lifeEnglish: [
        ...backupData.lifeEnglish,
        { profileId: "member-2", records: [] },
      ],
    };
    const password = "a-secure-backup-password";
    const backup = await createEncryptedBackup(data, password);

    await expect(
      decryptAndValidateBackup(backup, password),
    ).resolves.toMatchObject({
      data,
    });
  });

  it("rejects an incorrect backup password", async () => {
    const backup = await createEncryptedBackup(
      backupData,
      "a-secure-backup-password",
    );

    await expect(
      decryptAndValidateBackup(backup, "the-wrong-backup-password"),
    ).rejects.toThrow();
  });

  it("rejects tampered encrypted payloads", async () => {
    const password = "a-secure-backup-password";
    const backup = await createEncryptedBackup(backupData, password);
    const replacement = backup.ciphertext[0] === "0" ? "1" : "0";
    const tampered = {
      ...backup,
      ciphertext: replacement + backup.ciphertext.slice(1),
    };

    await expect(
      decryptAndValidateBackup(tampered, password),
    ).rejects.toThrow();
  });

  it("rejects readable metadata that does not match the encrypted payload", async () => {
    const password = "a-secure-backup-password";
    const backup = await createEncryptedBackup(backupData, password);

    await expect(
      decryptAndValidateBackup({ ...backup, appVersion: "9.9.9" }, password),
    ).rejects.toThrow("metadata does not match");
  });

  it("rejects unsupported wrappers before decryption", async () => {
    const backup = await createEncryptedBackup(
      backupData,
      "a-secure-backup-password",
    );

    await expect(
      decryptAndValidateBackup(
        { ...backup, dataSchemaVersion: 999 },
        "a-secure-backup-password",
      ),
    ).rejects.toThrow("format is not supported");
  });

  it("rejects unsupported or malicious wrapper JSON", () => {
    expect(() =>
      parseEncryptedBackupFile(
        JSON.stringify({
          format: "urbanfox-ilr-encrypted-backup",
          version: 999,
        }),
      ),
    ).toThrow("format is not supported");
  });

  it("rejects malformed backup JSON", () => {
    expect(() => parseEncryptedBackupFile("{not-json")).toThrow(
      "not valid JSON",
    );
  });
});
