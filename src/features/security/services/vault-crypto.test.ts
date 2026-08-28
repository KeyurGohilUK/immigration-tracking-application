import { describe, expect, it } from "vitest";
import { createVault, isVaultRecord, unlockVault } from "./vault-crypto";

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
});
