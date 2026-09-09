import { bytesToBase64, base64ToBytes } from "../../../shared/encoding/base64";
import { bytesToHex, hexToBytes } from "../../../shared/encoding/hex";
import type { MasterKeyVaultRecord } from "./vault-crypto";
import {
  getMasterKeyBytesWithPin,
  importMasterKey,
  verifyMasterKeyForVault,
} from "./vault-crypto";
import {
  browserDeviceAuthenticator,
  type DeviceAuthenticator,
  type DeviceCredential,
} from "./device-authenticator";

const MASTER_KEY_BYTES = 32;
const WRAPPED_MASTER_KEY_BYTES = MASTER_KEY_BYTES + 16;
const HKDF_INFO = new TextEncoder().encode(
  "urbanfox-ilr-device-unlock-wrap-v1",
);

export interface DeviceUnlockRecord {
  version: 1;
  credentialId: string;
  prfInput: string;
  keyDerivationSalt: string;
  initializationVector: string;
  wrappedMasterKey: string;
  enrolledAt: string;
}

export type DeviceUnlockFailure =
  | "unsupported"
  | "cancelled"
  | "failed"
  | "pin-invalid"
  | "credential-unavailable";

export type DeviceEnrollmentResult =
  | { status: "success"; record: DeviceUnlockRecord }
  | { status: DeviceUnlockFailure; diagnostic?: string };

export type DeviceAuthenticationResult =
  { status: "success"; key: CryptoKey } | { status: DeviceUnlockFailure };

function toBase64Url(bytes: Uint8Array): string {
  return bytesToBase64(bytes)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replace(/=+$/u, "");
}

function fromBase64Url(value: string): Uint8Array<ArrayBuffer> {
  const base64 = value.replaceAll("-", "+").replaceAll("_", "/");
  return base64ToBytes(base64.padEnd(Math.ceil(base64.length / 4) * 4, "="));
}

function isHex(value: unknown, bytes: number): boolean {
  return (
    typeof value === "string" &&
    value.length === bytes * 2 &&
    /^[0-9a-f]+$/iu.test(value)
  );
}

export function isDeviceUnlockRecord(
  value: unknown,
): value is DeviceUnlockRecord {
  if (!value || typeof value !== "object") return false;
  const record = value as Partial<DeviceUnlockRecord>;
  if (
    record.version !== 1 ||
    typeof record.credentialId !== "string" ||
    !/^[A-Za-z0-9_-]{2,1366}$/u.test(record.credentialId) ||
    !isHex(record.prfInput, 32) ||
    !isHex(record.keyDerivationSalt, 16) ||
    !isHex(record.initializationVector, 12) ||
    !isHex(record.wrappedMasterKey, WRAPPED_MASTER_KEY_BYTES) ||
    typeof record.enrolledAt !== "string" ||
    Number.isNaN(Date.parse(record.enrolledAt))
  )
    return false;
  try {
    const byteLength = fromBase64Url(record.credentialId).byteLength;
    return byteLength > 0 && byteLength <= 1023;
  } catch {
    return false;
  }
}

async function deriveWrappingKey(
  prfOutput: Uint8Array<ArrayBuffer>,
  keyDerivationSalt: Uint8Array<ArrayBuffer>,
  usages: KeyUsage[],
): Promise<CryptoKey> {
  if (prfOutput.byteLength !== 32)
    throw new Error("The device authenticator did not return a valid secret.");
  const material = await crypto.subtle.importKey(
    "raw",
    prfOutput,
    "HKDF",
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    {
      name: "HKDF",
      hash: "SHA-256",
      salt: keyDerivationSalt,
      info: HKDF_INFO,
    },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    usages,
  );
}

function classifyError(error: unknown): DeviceUnlockFailure {
  if (error instanceof DOMException && error.name === "NotAllowedError")
    return "cancelled";
  if (
    error instanceof DOMException &&
    ["InvalidStateError", "NotSupportedError"].includes(error.name)
  )
    return "credential-unavailable";
  return "failed";
}

async function getPrfCredential(
  credential: DeviceCredential,
  prfInput: Uint8Array<ArrayBuffer>,
  authenticator: DeviceAuthenticator,
): Promise<DeviceCredential | null> {
  if (credential.prfOutput) return credential;
  return authenticator.get(
    crypto.getRandomValues(new Uint8Array(32)),
    credential.credentialId,
    prfInput,
  );
}

export async function enrollDeviceUnlock(
  pin: string,
  vaultRecord: MasterKeyVaultRecord,
  authenticator: DeviceAuthenticator = browserDeviceAuthenticator,
): Promise<DeviceEnrollmentResult> {
  if (!(await authenticator.isAvailable())) return { status: "unsupported" };
  const masterKeyBytes = await getMasterKeyBytesWithPin(pin, vaultRecord);
  if (!masterKeyBytes) return { status: "pin-invalid" };
  const prfInput = crypto.getRandomValues(new Uint8Array(32));
  try {
    const created = await authenticator.create(
      crypto.getRandomValues(new Uint8Array(32)),
      crypto.getRandomValues(new Uint8Array(32)),
      prfInput,
    );
    if (!created) return { status: "failed" };
    const credential = await getPrfCredential(created, prfInput, authenticator);
    if (!credential?.prfOutput) return { status: "credential-unavailable" };
    const keyDerivationSalt = crypto.getRandomValues(new Uint8Array(16));
    const initializationVector = crypto.getRandomValues(new Uint8Array(12));
    const wrappingKey = await deriveWrappingKey(
      credential.prfOutput,
      keyDerivationSalt,
      ["encrypt"],
    );
    const wrappedMasterKey = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: initializationVector },
      wrappingKey,
      masterKeyBytes,
    );
    return {
      status: "success",
      record: {
        version: 1,
        credentialId: toBase64Url(credential.credentialId),
        prfInput: bytesToHex(prfInput),
        keyDerivationSalt: bytesToHex(keyDerivationSalt),
        initializationVector: bytesToHex(initializationVector),
        wrappedMasterKey: bytesToHex(new Uint8Array(wrappedMasterKey)),
        enrolledAt: new Date().toISOString(),
      },
    };
  } catch (error) {
    return {
      status: classifyError(error),
      diagnostic: error instanceof Error ? error.name : "UnknownError",
    };
  } finally {
    masterKeyBytes.fill(0);
  }
}

export async function authenticateWithDevice(
  record: DeviceUnlockRecord,
  vaultRecord: MasterKeyVaultRecord,
  authenticator: DeviceAuthenticator = browserDeviceAuthenticator,
): Promise<DeviceAuthenticationResult> {
  if (!(await authenticator.isAvailable())) return { status: "unsupported" };
  try {
    const credential = await authenticator.get(
      crypto.getRandomValues(new Uint8Array(32)),
      fromBase64Url(record.credentialId),
      hexToBytes(record.prfInput),
    );
    if (!credential?.prfOutput) return { status: "credential-unavailable" };
    const wrappingKey = await deriveWrappingKey(
      credential.prfOutput,
      hexToBytes(record.keyDerivationSalt),
      ["decrypt"],
    );
    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: hexToBytes(record.initializationVector) },
      wrappingKey,
      hexToBytes(record.wrappedMasterKey),
    );
    const masterKeyBytes = new Uint8Array(decrypted);
    try {
      const key = await importMasterKey(masterKeyBytes);
      return (await verifyMasterKeyForVault(key, vaultRecord))
        ? { status: "success", key }
        : { status: "failed" };
    } finally {
      masterKeyBytes.fill(0);
    }
  } catch (error) {
    return { status: classifyError(error) };
  }
}
