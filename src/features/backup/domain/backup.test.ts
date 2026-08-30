import { describe, expect, it } from "vitest";
import {
  BACKUP_PASSWORD_MINIMUM_LENGTH,
  validateBackupPassword,
} from "./backup";

describe("backup password validation", () => {
  it("requires a password that is stronger than the local PIN", () => {
    expect(validateBackupPassword("2468", "2468")).toContain(
      String(BACKUP_PASSWORD_MINIMUM_LENGTH),
    );
  });

  it("requires matching passwords", () => {
    expect(
      validateBackupPassword("a-secure-backup-password", "different-value"),
    ).toBe("The backup passwords do not match.");
  });

  it("accepts a matching password of at least 12 characters", () => {
    expect(
      validateBackupPassword(
        "a-secure-backup-password",
        "a-secure-backup-password",
      ),
    ).toBeNull();
  });
});
