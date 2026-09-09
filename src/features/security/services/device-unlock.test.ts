import { describe, expect, it } from "vitest";
import type {
  DeviceAuthenticator,
  DeviceCredential,
} from "./device-authenticator";
import { authenticateWithDevice, enrollDeviceUnlock } from "./device-unlock";
import { createVault, unlockVault } from "./vault-crypto";

const credentialId = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
const prfOutput = new Uint8Array(32).fill(27);

function authenticator(
  options: {
    available?: boolean;
    credential?: DeviceCredential | null;
    error?: DOMException;
  } = {},
): DeviceAuthenticator {
  const credential = options.credential ?? { credentialId, prfOutput };
  return {
    isAvailable: async () => options.available ?? true,
    create: async () => {
      if (options.error) throw options.error;
      return credential;
    },
    get: async () => {
      if (options.error) throw options.error;
      return credential;
    },
  };
}

describe("Device Unlock", () => {
  it("remains disabled on unsupported platforms", async () => {
    const vault = await createVault("4826");
    await expect(
      enrollDeviceUnlock(
        "4826",
        vault.record,
        authenticator({ available: false }),
      ),
    ).resolves.toEqual({ status: "unsupported" });
  });

  it("requires the current PIN for enrollment", async () => {
    const vault = await createVault("4826");
    await expect(
      enrollDeviceUnlock("1111", vault.record, authenticator()),
    ).resolves.toEqual({ status: "pin-invalid" });
  });

  it("enrolls and unlocks the existing master key", async () => {
    const vault = await createVault("4826");
    const enrollment = await enrollDeviceUnlock(
      "4826",
      vault.record,
      authenticator(),
    );
    expect(enrollment.status).toBe("success");
    if (enrollment.status !== "success") return;

    const result = await authenticateWithDevice(
      enrollment.record,
      vault.record,
      authenticator(),
    );
    expect(result.status).toBe("success");
    expect(await unlockVault("4826", vault.record)).toBeInstanceOf(CryptoKey);
  });

  it("does not unlock when the credential secret is unavailable", async () => {
    const vault = await createVault("4826");
    const enrollment = await enrollDeviceUnlock(
      "4826",
      vault.record,
      authenticator(),
    );
    if (enrollment.status !== "success") throw new Error("Enrollment failed");

    await expect(
      authenticateWithDevice(
        enrollment.record,
        vault.record,
        authenticator({ credential: { credentialId, prfOutput: null } }),
      ),
    ).resolves.toEqual({ status: "credential-unavailable" });
  });

  it("treats a cancelled device prompt as a non-destructive cancellation", async () => {
    const vault = await createVault("4826");
    await expect(
      enrollDeviceUnlock(
        "4826",
        vault.record,
        authenticator({
          error: new DOMException("cancelled", "NotAllowedError"),
        }),
      ),
    ).resolves.toEqual({ status: "cancelled" });
  });

  it("rejects an authentication secret from a different credential", async () => {
    const vault = await createVault("4826");
    const enrollment = await enrollDeviceUnlock(
      "4826",
      vault.record,
      authenticator(),
    );
    if (enrollment.status !== "success") throw new Error("Enrollment failed");
    const wrongSecret = new Uint8Array(32).fill(99);

    await expect(
      authenticateWithDevice(
        enrollment.record,
        vault.record,
        authenticator({
          credential: { credentialId, prfOutput: wrongSecret },
        }),
      ),
    ).resolves.toEqual({ status: "failed" });
  });
});
