import { isValidPin } from "../domain/pin";
import { bytesToHex, hexToBytes } from "../../../shared/encoding/hex";

const KEY_DERIVATION_ITERATIONS = 310_000;
const VALIDATION_MESSAGE = "urbanfox-ilr-vault-v1";
const MASTER_KEY_BYTES = 32;

export interface LegacyVaultRecord {
  version: 1;
  iterations: number;
  salt: string;
  initializationVector: string;
  encryptedVerifier: string;
}

export interface MasterKeyVaultRecord {
  version: 2;
  iterations: number;
  pinSalt: string;
  pinWrapInitializationVector: string;
  wrappedMasterKey: string;
  verifierInitializationVector: string;
  encryptedVerifier: string;
}

export type VaultRecord = LegacyVaultRecord | MasterKeyVaultRecord;

export interface CreatedVault {
  key: CryptoKey;
  record: MasterKeyVaultRecord;
}

export interface PinUnlockResult {
  key: CryptoKey;
  upgradedRecord?: MasterKeyVaultRecord;
}

function isHexOfLength(value: unknown, byteLength: number): boolean {
  return (
    typeof value === "string" &&
    value.length === byteLength * 2 &&
    /^[0-9a-f]+$/i.test(value)
  );
}

function isEncryptedHex(value: unknown, minimumBytes: number): boolean {
  return (
    typeof value === "string" &&
    value.length >= minimumBytes * 2 &&
    value.length <= 512 &&
    value.length % 2 === 0 &&
    /^[0-9a-f]+$/i.test(value)
  );
}

export function isVaultRecord(value: unknown): value is VaultRecord {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  if (record.version === 1 && record.iterations === KEY_DERIVATION_ITERATIONS) {
    return (
      isHexOfLength(record.salt, 16) &&
      isHexOfLength(record.initializationVector, 12) &&
      isEncryptedHex(record.encryptedVerifier, 16)
    );
  }
  if (record.version === 2 && record.iterations === KEY_DERIVATION_ITERATIONS) {
    return (
      isHexOfLength(record.pinSalt, 16) &&
      isHexOfLength(record.pinWrapInitializationVector, 12) &&
      isHexOfLength(record.wrappedMasterKey, MASTER_KEY_BYTES + 16) &&
      isHexOfLength(record.verifierInitializationVector, 12) &&
      isEncryptedHex(record.encryptedVerifier, 16)
    );
  }
  return false;
}

async function derivePinBytes(
  pin: string,
  salt: Uint8Array<ArrayBuffer>,
  iterations: number,
): Promise<Uint8Array<ArrayBuffer>> {
  if (!isValidPin(pin))
    throw new Error("PIN must contain exactly four digits.");
  const material = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(pin),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  return new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: "PBKDF2", hash: "SHA-256", salt, iterations },
      material,
      MASTER_KEY_BYTES * 8,
    ),
  );
}

async function importAesKey(
  bytes: Uint8Array<ArrayBuffer>,
  usages: KeyUsage[],
): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", bytes, "AES-GCM", false, usages);
}

async function encryptVerifier(
  masterKey: CryptoKey,
): Promise<{ initializationVector: Uint8Array<ArrayBuffer>; value: string }> {
  const initializationVector = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: initializationVector },
    masterKey,
    new TextEncoder().encode(VALIDATION_MESSAGE),
  );
  return {
    initializationVector,
    value: bytesToHex(new Uint8Array(encrypted)),
  };
}

async function verifyMasterKey(
  masterKey: CryptoKey,
  initializationVector: string,
  encryptedVerifier: string,
): Promise<boolean> {
  try {
    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: hexToBytes(initializationVector) },
      masterKey,
      hexToBytes(encryptedVerifier),
    );
    return new TextDecoder().decode(decrypted) === VALIDATION_MESSAGE;
  } catch {
    return false;
  }
}

export function verifyMasterKeyForVault(
  masterKey: CryptoKey,
  record: MasterKeyVaultRecord,
): Promise<boolean> {
  return verifyMasterKey(
    masterKey,
    record.verifierInitializationVector,
    record.encryptedVerifier,
  );
}

export async function createPinWrappedVaultRecord(
  pin: string,
  masterKeyBytes: Uint8Array<ArrayBuffer>,
): Promise<MasterKeyVaultRecord> {
  if (masterKeyBytes.byteLength !== MASTER_KEY_BYTES)
    throw new Error("Master key must contain exactly 32 bytes.");
  const pinSalt = crypto.getRandomValues(new Uint8Array(16));
  const pinWrapInitializationVector = crypto.getRandomValues(
    new Uint8Array(12),
  );
  const pinKeyBytes = await derivePinBytes(
    pin,
    pinSalt,
    KEY_DERIVATION_ITERATIONS,
  );
  try {
    const pinKey = await importAesKey(pinKeyBytes, ["encrypt"]);
    const wrappedMasterKey = await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: pinWrapInitializationVector },
      pinKey,
      masterKeyBytes,
    );
    const masterKey = await importAesKey(masterKeyBytes, [
      "encrypt",
      "decrypt",
    ]);
    const verifier = await encryptVerifier(masterKey);
    return {
      version: 2,
      iterations: KEY_DERIVATION_ITERATIONS,
      pinSalt: bytesToHex(pinSalt),
      pinWrapInitializationVector: bytesToHex(pinWrapInitializationVector),
      wrappedMasterKey: bytesToHex(new Uint8Array(wrappedMasterKey)),
      verifierInitializationVector: bytesToHex(verifier.initializationVector),
      encryptedVerifier: verifier.value,
    };
  } finally {
    pinKeyBytes.fill(0);
  }
}

export async function createVault(pin: string): Promise<CreatedVault> {
  const masterKeyBytes = crypto.getRandomValues(
    new Uint8Array(MASTER_KEY_BYTES),
  );
  try {
    const record = await createPinWrappedVaultRecord(pin, masterKeyBytes);
    const key = await importAesKey(masterKeyBytes, ["encrypt", "decrypt"]);
    return { key, record };
  } finally {
    masterKeyBytes.fill(0);
  }
}

async function getLegacyMasterKeyBytes(
  pin: string,
  record: LegacyVaultRecord,
): Promise<Uint8Array<ArrayBuffer> | null> {
  const masterKeyBytes = await derivePinBytes(
    pin,
    hexToBytes(record.salt),
    record.iterations,
  );
  const key = await importAesKey(masterKeyBytes, ["encrypt", "decrypt"]);
  if (
    !(await verifyMasterKey(
      key,
      record.initializationVector,
      record.encryptedVerifier,
    ))
  ) {
    masterKeyBytes.fill(0);
    return null;
  }
  return masterKeyBytes;
}

export async function getMasterKeyBytesWithPin(
  pin: string,
  record: VaultRecord,
): Promise<Uint8Array<ArrayBuffer> | null> {
  try {
    if (record.version === 1) return getLegacyMasterKeyBytes(pin, record);
    const pinKeyBytes = await derivePinBytes(
      pin,
      hexToBytes(record.pinSalt),
      record.iterations,
    );
    try {
      const pinKey = await importAesKey(pinKeyBytes, ["decrypt"]);
      const decrypted = await crypto.subtle.decrypt(
        {
          name: "AES-GCM",
          iv: hexToBytes(record.pinWrapInitializationVector),
        },
        pinKey,
        hexToBytes(record.wrappedMasterKey),
      );
      const masterKeyBytes = new Uint8Array(decrypted);
      const masterKey = await importAesKey(masterKeyBytes, [
        "encrypt",
        "decrypt",
      ]);
      if (
        await verifyMasterKey(
          masterKey,
          record.verifierInitializationVector,
          record.encryptedVerifier,
        )
      )
        return masterKeyBytes;
      masterKeyBytes.fill(0);
      return null;
    } finally {
      pinKeyBytes.fill(0);
    }
  } catch {
    return null;
  }
}

export async function unlockVaultWithPin(
  pin: string,
  record: VaultRecord,
): Promise<PinUnlockResult | null> {
  const masterKeyBytes = await getMasterKeyBytesWithPin(pin, record);
  if (!masterKeyBytes) return null;
  try {
    return {
      key: await importAesKey(masterKeyBytes, ["encrypt", "decrypt"]),
      upgradedRecord:
        record.version === 1
          ? await createPinWrappedVaultRecord(pin, masterKeyBytes)
          : undefined,
    };
  } finally {
    masterKeyBytes.fill(0);
  }
}

export async function unlockVault(
  pin: string,
  record: VaultRecord,
): Promise<CryptoKey | null> {
  return (await unlockVaultWithPin(pin, record))?.key ?? null;
}

export async function importMasterKey(
  masterKeyBytes: Uint8Array<ArrayBuffer>,
): Promise<CryptoKey> {
  if (masterKeyBytes.byteLength !== MASTER_KEY_BYTES)
    throw new Error("Master key must contain exactly 32 bytes.");
  return importAesKey(masterKeyBytes, ["encrypt", "decrypt"]);
}
