import { isValidPin } from "../domain/pin";
import { bytesToHex, hexToBytes } from "./crypto-encoding";

const KEY_DERIVATION_ITERATIONS = 310_000;
const VALIDATION_MESSAGE = "urbanfox-ilr-vault-v1";

export interface VaultRecord {
  version: 1;
  iterations: number;
  salt: string;
  initializationVector: string;
  encryptedVerifier: string;
}

export interface CreatedVault {
  key: CryptoKey;
  record: VaultRecord;
}

function isHexOfLength(value: unknown, byteLength: number): boolean {
  return (
    typeof value === "string" &&
    value.length === byteLength * 2 &&
    /^[0-9a-f]+$/i.test(value)
  );
}

export function isVaultRecord(value: unknown): value is VaultRecord {
  if (!value || typeof value !== "object") {
    return false;
  }

  const record = value as Partial<VaultRecord>;
  return (
    record.version === 1 &&
    record.iterations === KEY_DERIVATION_ITERATIONS &&
    isHexOfLength(record.salt, 16) &&
    isHexOfLength(record.initializationVector, 12) &&
    typeof record.encryptedVerifier === "string" &&
    record.encryptedVerifier.length >= 32 &&
    record.encryptedVerifier.length <= 512 &&
    record.encryptedVerifier.length % 2 === 0 &&
    /^[0-9a-f]+$/i.test(record.encryptedVerifier)
  );
}

async function deriveKey(
  pin: string,
  salt: Uint8Array<ArrayBuffer>,
  iterations: number,
): Promise<CryptoKey> {
  if (!isValidPin(pin)) {
    throw new Error("PIN must contain exactly four digits.");
  }

  const material = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(pin),
    "PBKDF2",
    false,
    ["deriveKey"],
  );

  return crypto.subtle.deriveKey(
    { name: "PBKDF2", hash: "SHA-256", salt, iterations },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

export async function createVault(pin: string): Promise<CreatedVault> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const initializationVector = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(pin, salt, KEY_DERIVATION_ITERATIONS);
  const encryptedVerifier = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: initializationVector },
    key,
    new TextEncoder().encode(VALIDATION_MESSAGE),
  );

  return {
    key,
    record: {
      version: 1,
      iterations: KEY_DERIVATION_ITERATIONS,
      salt: bytesToHex(salt),
      initializationVector: bytesToHex(initializationVector),
      encryptedVerifier: bytesToHex(new Uint8Array(encryptedVerifier)),
    },
  };
}

export async function unlockVault(
  pin: string,
  record: VaultRecord,
): Promise<CryptoKey | null> {
  try {
    const key = await deriveKey(
      pin,
      hexToBytes(record.salt),
      record.iterations,
    );
    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: hexToBytes(record.initializationVector) },
      key,
      hexToBytes(record.encryptedVerifier),
    );

    return new TextDecoder().decode(decrypted) === VALIDATION_MESSAGE
      ? key
      : null;
  } catch {
    return null;
  }
}
