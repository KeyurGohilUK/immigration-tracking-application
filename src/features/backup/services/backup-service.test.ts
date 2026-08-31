import { describe, expect, it } from "vitest";
import type { BackupData } from "../domain/backup";
import {
  createEncryptedBackup,
  decryptAndValidateBackup,
  parseEncryptedBackupFile,
} from "./backup-service";

const backupData: BackupData = {
  owner: {
    version: 1,
    id: "owner",
    fullName: "Encrypted Test Person",
    dateOfBirth: "1990-01-01",
    createdAt: "2026-08-30T10:00:00.000Z",
    updatedAt: "2026-08-30T10:00:00.000Z",
  },
  familyMembers: [],
  permissions: [{ profileId: "owner", records: [] }],
  trips: [{ profileId: "owner", records: [] }],
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
            profileId: "owner",
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

  it("rejects an incorrect backup password", async () => {
    const backup = await createEncryptedBackup(
      backupData,
      "a-secure-backup-password",
    );

    await expect(
      decryptAndValidateBackup(backup, "the-wrong-backup-password"),
    ).rejects.toThrow();
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

  it("rejects malformed backup JSON", () => {
    expect(() => parseEncryptedBackupFile("{not-json")).toThrow(
      "not valid JSON",
    );
  });
});
