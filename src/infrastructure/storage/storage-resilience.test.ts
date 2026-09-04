import { afterEach, describe, expect, it, vi } from "vitest";
import { openAppDatabase } from "./app-database";
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
