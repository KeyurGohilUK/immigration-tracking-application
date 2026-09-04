import { toStorageFailure } from "./storage-error";

export function waitForTransaction(
  transaction: IDBTransaction,
  database: IDBDatabase,
  operation: "read" | "write",
): Promise<void> {
  return new Promise((resolve, reject) => {
    let settled = false;
    const finish = (callback: () => void): void => {
      if (settled) return;
      settled = true;
      database.close();
      callback();
    };

    transaction.oncomplete = () => finish(resolve);
    transaction.onerror = () =>
      finish(() =>
        reject(
          toStorageFailure(
            transaction.error,
            operation === "read" ? "read-failed" : "write-failed",
            operation === "read"
              ? "Encrypted local data could not be read."
              : "Encrypted local data could not be saved.",
          ),
        ),
      );
    transaction.onabort = () =>
      finish(() =>
        reject(
          toStorageFailure(
            transaction.error,
            operation === "read" ? "read-failed" : "write-failed",
            operation === "read"
              ? "Encrypted local data read was interrupted."
              : "Encrypted local data save was interrupted. Existing data was left unchanged.",
          ),
        ),
      );
  });
}
