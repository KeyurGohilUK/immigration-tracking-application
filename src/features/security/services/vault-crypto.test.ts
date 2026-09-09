import { describe, expect, it } from "vitest";
import { bytesToHex } from "../../../shared/encoding/hex";
import {
  createVault,
  isVaultRecord,
  unlockVault,
  unlockVaultWithPin,
  type LegacyVaultRecord,
} from "./vault-crypto";

async function createLegacyVault(pin: string): Promise<{
  key: CryptoKey;
  record: LegacyVaultRecord;
}> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const material = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(pin),
    "PBKDF2",
    false,
    ["deriveKey"],
  );
  const key = await crypto.subtle.deriveKey(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations: 310_000 },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
  const initializationVector = crypto.getRandomValues(new Uint8Array(12));
  const encryptedVerifier = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: initializationVector },
    key,
    new TextEncoder().encode("urbanfox-ilr-vault-v1"),
  );
  return {
    key,
    record: {
      version: 1,
      iterations: 310_000,
      salt: bytesToHex(salt),
      initializationVector: bytesToHex(initializationVector),
      encryptedVerifier: bytesToHex(new Uint8Array(encryptedVerifier)),
    },
  };
}

describe("encrypted vault", () => {
  it("unlocks with the PIN used to create it", async () => {
    const vault = await createVault("4826");

    await expect(unlockVault("4826", vault.record)).resolves.toBeInstanceOf(
      CryptoKey,
    );
  });

  it("does not unlock with a different PIN", async () => {
    const vault = await createVault("4826");

    await expect(unlockVault("4827", vault.record)).resolves.toBeNull();
  });

  it("rejects a PIN that is not exactly four digits", async () => {
    await expect(createVault("12345")).rejects.toThrow("exactly four digits");
  });

  it("rejects malformed or unsupported stored vault records", () => {
    expect(isVaultRecord(null)).toBe(false);
    expect(
      isVaultRecord({
        version: 1,
        iterations: 999_999_999,
        salt: "00",
        initializationVector: "00",
        encryptedVerifier: "00",
      }),
    ).toBe(false);
  });

  it("creates a random master key wrapped by the PIN", async () => {
    const first = await createVault("4826");
    const second = await createVault("4826");

    expect(first.record.version).toBe(2);
    expect(first.record.wrappedMasterKey).not.toBe(
      second.record.wrappedMasterKey,
    );
    expect(first.key.extractable).toBe(false);
  });

  it("migrates a legacy vault without changing its data encryption key", async () => {
    const legacy = await createLegacyVault("4826");
    const initializationVector = crypto.getRandomValues(new Uint8Array(12));
    const ciphertext = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: initializationVector },
      legacy.key,
      new TextEncoder().encode("existing encrypted household data"),
    );

    const unlocked = await unlockVaultWithPin("4826", legacy.record);

    expect(unlocked?.upgradedRecord?.version).toBe(2);
    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: initializationVector },
      unlocked!.key,
      ciphertext,
    );
    expect(new TextDecoder().decode(decrypted)).toBe(
      "existing encrypted household data",
    );
    await expect(
      unlockVault("4826", unlocked!.upgradedRecord!),
    ).resolves.toBeInstanceOf(CryptoKey);
  });
});
