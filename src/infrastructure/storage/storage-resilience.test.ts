import { afterEach, describe, expect, it, vi } from "vitest";
import {
  applyDatabaseUpgrade,
  DATABASE_STORES,
  openAppDatabase,
} from "./app-database";
import {
  getStorageFailureMessage,
  StorageFailure,
  toStorageFailure,
} from "./storage-error";
import { waitForTransaction } from "./storage-transaction";

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("storage resilience", () => {
  it("reports IndexedDB as unavailable without attempting setup", async () => {
    vi.stubGlobal("indexedDB", undefined);

    await expect(openAppDatabase()).rejects.toMatchObject({
      name: "StorageFailure",
      code: "unavailable",
    });
  });

  it("creates missing stores and clears legacy sensitive stores during migration", () => {
    const cleared: string[] = [];
    const existing = new Set<string>([DATABASE_STORES.security]);
    const database = {
      objectStoreNames: {
        contains: (name: string) => existing.has(name),
      },
      createObjectStore: vi.fn((name: string) => {
        existing.add(name);
        return {} as IDBObjectStore;
      }),
    } as unknown as IDBDatabase;
    const transaction = {
      objectStore: (name: string) =>
        ({
          clear: () => {
            cleared.push(name);
          },
        }) as unknown as IDBObjectStore,
    } as unknown as IDBTransaction;

    applyDatabaseUpgrade(database, transaction, 5);

    for (const store of Object.values(DATABASE_STORES))
      expect(existing.has(store)).toBe(true);
    expect(cleared).toEqual([
      DATABASE_STORES.profiles,
      DATABASE_STORES.permissions,
      DATABASE_STORES.trips,
      DATABASE_STORES.documents,
    ]);
  });

  it("does not clear current-version records during a later additive migration", () => {
    const cleared: string[] = [];
    const existing = new Set<string>(Object.values(DATABASE_STORES));
    const database = {
      objectStoreNames: {
        contains: (name: string) => existing.has(name),
      },
      createObjectStore: vi.fn(),
    } as unknown as IDBDatabase;
    const transaction = {
      objectStore: (name: string) =>
        ({
          clear: () => {
            cleared.push(name);
          },
        }) as unknown as IDBObjectStore,
    } as unknown as IDBTransaction;

    applyDatabaseUpgrade(database, transaction, 7);

    expect(cleared).toEqual([]);
    expect(database.createObjectStore).not.toHaveBeenCalled();
  });

  it("maps browser quota errors to a clear storage-full failure", () => {
    const quotaError = new DOMException("Quota reached", "QuotaExceededError");
    const failure = toStorageFailure(
      quotaError,
      "write-failed",
      "Encrypted local data could not be saved.",
    );

    expect(failure.code).toBe("quota-exceeded");
    expect(getStorageFailureMessage(failure)).toContain("storage is full");
  });

  it("closes the database and rejects an interrupted write without claiming success", async () => {
    const database = {
      close: vi.fn(),
    } as unknown as IDBDatabase;
    const transaction = {
      error: new DOMException("Transaction aborted", "AbortError"),
      oncomplete: null,
      onerror: null,
      onabort: null,
    } as unknown as IDBTransaction;

    const completion = waitForTransaction(transaction, database, "write");
    transaction.onabort?.(new Event("abort"));

    await expect(completion).rejects.toMatchObject({
      name: "StorageFailure",
      code: "write-failed",
    });
    expect(database.close).toHaveBeenCalledTimes(1);
  });

  it("does not settle twice when an error is followed by an abort event", async () => {
    const database = {
      close: vi.fn(),
    } as unknown as IDBDatabase;
    const transaction = {
      error: new DOMException("Quota reached", "QuotaExceededError"),
      oncomplete: null,
      onerror: null,
      onabort: null,
    } as unknown as IDBTransaction;

    const completion = waitForTransaction(transaction, database, "write");
    transaction.onerror?.(new Event("error"));
    transaction.onabort?.(new Event("abort"));

    await expect(completion).rejects.toMatchObject({
      code: "quota-exceeded",
    });
    expect(database.close).toHaveBeenCalledTimes(1);
  });

  it("keeps migration failures distinct from ordinary unavailable storage", () => {
    const failure = new StorageFailure(
      "migration-failed",
      "Private storage could not be upgraded safely.",
    );

    expect(getStorageFailureMessage(failure)).toContain(
      "Existing encrypted data was left unchanged",
    );
  });
});
