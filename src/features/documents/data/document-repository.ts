import { bytesToHex, hexToBytes } from "../../../shared/encoding/hex";
import {
  DATABASE_STORES,
  openAppDatabase,
} from "../../../infrastructure/storage/app-database";
import {
  decryptRecord,
  encryptRecord,
  isEncryptedRecord,
  type EncryptedRecord,
} from "../../../infrastructure/storage/encrypted-record-store";
import {
  isDocumentMetadata,
  validateDocumentSignature,
  type DocumentMetadata,
} from "../domain/document";

interface EncryptedDocumentFile {
  version: 1;
  initializationVector: string;
  ciphertext: ArrayBuffer;
}

export interface EncryptedDocumentRecord {
  version: 1;
  metadata: EncryptedRecord;
  file: EncryptedDocumentFile;
}

export interface DecryptedDocumentFile {
  metadata: DocumentMetadata;
  bytes: Uint8Array<ArrayBuffer>;
}

function isEncryptedDocumentFile(
  value: unknown,
): value is EncryptedDocumentFile {
  if (!value || typeof value !== "object") return false;
  const file = value as Partial<EncryptedDocumentFile>;
  return (
    file.version === 1 &&
    typeof file.initializationVector === "string" &&
    /^[0-9a-f]{24}$/i.test(file.initializationVector) &&
    file.ciphertext instanceof ArrayBuffer &&
    file.ciphertext.byteLength >= 16
  );
}

function isEncryptedDocumentRecord(
  value: unknown,
): value is EncryptedDocumentRecord {
  if (!value || typeof value !== "object") return false;
  const record = value as Partial<EncryptedDocumentRecord>;
  return (
    record.version === 1 &&
    isEncryptedRecord(record.metadata) &&
    isEncryptedDocumentFile(record.file)
  );
}

async function encryptFile(
  bytes: Uint8Array<ArrayBuffer>,
  key: CryptoKey,
): Promise<EncryptedDocumentFile> {
  const initializationVector = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: initializationVector },
    key,
    bytes,
  );
  return {
    version: 1,
    initializationVector: bytesToHex(initializationVector),
    ciphertext,
  };
}

export async function createEncryptedDocumentRecord(
  metadata: DocumentMetadata,
  bytes: Uint8Array<ArrayBuffer>,
  key: CryptoKey,
): Promise<EncryptedDocumentRecord> {
  if (!isDocumentMetadata(metadata) || bytes.byteLength !== metadata.size)
    throw new Error("Document metadata is invalid.");
  const signatureError = validateDocumentSignature(metadata.mimeType, bytes);
  if (signatureError) throw new Error(signatureError);
  const [encryptedMetadata, encryptedFile] = await Promise.all([
    encryptRecord(metadata, key),
    encryptFile(bytes, key),
  ]);
  return { version: 1, metadata: encryptedMetadata, file: encryptedFile };
}

async function decryptFile(
  file: EncryptedDocumentFile,
  key: CryptoKey,
): Promise<Uint8Array<ArrayBuffer>> {
  if (!isEncryptedDocumentFile(file))
    throw new Error("Encrypted document content is invalid.");
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: hexToBytes(file.initializationVector) },
    key,
    file.ciphertext,
  );
  return new Uint8Array(decrypted);
}

async function getAllEncryptedDocuments(): Promise<EncryptedDocumentRecord[]> {
  const database = await openAppDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(
      DATABASE_STORES.documents,
      "readonly",
    );
    const request = transaction.objectStore(DATABASE_STORES.documents).getAll();
    request.onsuccess = () => {
      const records = request.result as unknown[];
      if (!records.every(isEncryptedDocumentRecord)) {
        reject(new Error("Encrypted documents are invalid."));
        return;
      }
      resolve(records);
    };
    request.onerror = () => reject(new Error("Documents could not be read."));
    transaction.oncomplete = () => database.close();
    transaction.onabort = () => database.close();
  });
}

async function getEncryptedDocument(
  id: string,
): Promise<EncryptedDocumentRecord> {
  const database = await openAppDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(
      DATABASE_STORES.documents,
      "readonly",
    );
    const request = transaction.objectStore(DATABASE_STORES.documents).get(id);
    request.onsuccess = () => {
      if (!isEncryptedDocumentRecord(request.result)) {
        reject(new Error("Encrypted document is unavailable or invalid."));
        return;
      }
      resolve(request.result);
    };
    request.onerror = () => reject(new Error("Document could not be read."));
    transaction.oncomplete = () => database.close();
    transaction.onabort = () => database.close();
  });
}

async function decryptMetadata(
  record: EncryptedDocumentRecord,
  key: CryptoKey,
): Promise<DocumentMetadata> {
  const value = await decryptRecord(record.metadata, key);
  if (!isDocumentMetadata(value))
    throw new Error("Decrypted document metadata is invalid.");
  return value;
}

export async function getAllDocumentMetadata(
  key: CryptoKey,
): Promise<DocumentMetadata[]> {
  const records = await getAllEncryptedDocuments();
  return Promise.all(records.map((record) => decryptMetadata(record, key)));
}

export async function saveDocument(
  metadata: DocumentMetadata,
  bytes: Uint8Array<ArrayBuffer>,
  key: CryptoKey,
): Promise<void> {
  const record = await createEncryptedDocumentRecord(metadata, bytes, key);
  const database = await openAppDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(
      DATABASE_STORES.documents,
      "readwrite",
    );
    transaction.objectStore(DATABASE_STORES.documents).put(record, metadata.id);
    transaction.oncomplete = () => {
      database.close();
      resolve();
    };
    transaction.onabort = () => {
      database.close();
      reject(new Error("Encrypted document could not be saved."));
    };
    transaction.onerror = () => {
      // IndexedDB aborts the transaction, preventing a partial write.
    };
  });
}

export async function getDocumentFile(
  id: string,
  key: CryptoKey,
): Promise<DecryptedDocumentFile> {
  const record = await getEncryptedDocument(id);
  const [metadata, bytes] = await Promise.all([
    decryptMetadata(record, key),
    decryptFile(record.file, key),
  ]);
  if (bytes.byteLength !== metadata.size)
    throw new Error("Decrypted document size does not match its metadata.");
  const signatureError = validateDocumentSignature(metadata.mimeType, bytes);
  if (signatureError) throw new Error(signatureError);
  return { metadata, bytes };
}

export async function saveDocumentMetadataBatch(
  documents: DocumentMetadata[],
  key: CryptoKey,
): Promise<void> {
  if (
    documents.length < 1 ||
    !documents.every(isDocumentMetadata) ||
    new Set(documents.map(({ id }) => id)).size !== documents.length
  )
    throw new Error("Document metadata changes are invalid.");
  const existing = await Promise.all(
    documents.map(async (metadata) => ({
      metadata,
      record: await getEncryptedDocument(metadata.id),
    })),
  );
  const updates = await Promise.all(
    existing.map(async ({ metadata, record }) => ({
      id: metadata.id,
      record: {
        ...record,
        metadata: await encryptRecord(metadata, key),
      } satisfies EncryptedDocumentRecord,
    })),
  );
  const database = await openAppDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(
      DATABASE_STORES.documents,
      "readwrite",
    );
    const store = transaction.objectStore(DATABASE_STORES.documents);
    for (const update of updates) store.put(update.record, update.id);
    transaction.oncomplete = () => {
      database.close();
      resolve();
    };
    transaction.onabort = () => {
      database.close();
      reject(new Error("Document metadata could not be updated."));
    };
    transaction.onerror = () => {
      // IndexedDB aborts the transaction, preventing partial metadata changes.
    };
  });
}

export async function deleteDocument(id: string): Promise<void> {
  const database = await openAppDatabase();
  await new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(
      DATABASE_STORES.documents,
      "readwrite",
    );
    transaction.objectStore(DATABASE_STORES.documents).delete(id);
    transaction.oncomplete = () => {
      database.close();
      resolve();
    };
    transaction.onabort = () => {
      database.close();
      reject(new Error("Document could not be deleted."));
    };
    transaction.onerror = () => {
      // IndexedDB aborts the transaction, preserving the document.
    };
  });
}
