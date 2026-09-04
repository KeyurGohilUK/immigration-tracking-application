export type StorageFailureCode =
  | "unavailable"
  | "quota-exceeded"
  | "read-failed"
  | "write-failed"
  | "migration-failed";

export class StorageFailure extends Error {
  constructor(
    public readonly code: StorageFailureCode,
    message: string,
    options?: { cause?: unknown },
  ) {
    super(message, options);
    this.name = "StorageFailure";
  }
}

export function isQuotaExceededError(error: unknown): boolean {
  if (!(error instanceof DOMException)) return false;
  return (
    error.name === "QuotaExceededError" ||
    error.name === "NS_ERROR_DOM_QUOTA_REACHED"
  );
}

export function toStorageFailure(
  error: unknown,
  fallbackCode: Exclude<StorageFailureCode, "quota-exceeded">,
  fallbackMessage: string,
): StorageFailure {
  if (error instanceof StorageFailure) return error;
  if (isQuotaExceededError(error)) {
    return new StorageFailure(
      "quota-exceeded",
      "Private storage is full. Free browser storage space and try again.",
      { cause: error },
    );
  }
  return new StorageFailure(fallbackCode, fallbackMessage, { cause: error });
}

export function getStorageFailureMessage(
  error: unknown,
  fallbackMessage = "Private storage could not be accessed.",
): string {
  if (error instanceof StorageFailure) {
    switch (error.code) {
      case "quota-exceeded":
        return "Private storage is full. Free browser storage space and try again.";
      case "unavailable":
        return "Private storage is unavailable in this browser.";
      case "migration-failed":
        return "Private storage could not be upgraded safely. Existing encrypted data was left unchanged.";
      case "read-failed":
        return "Encrypted local data could not be opened.";
      case "write-failed":
        return "Encrypted local data could not be saved. Existing data was left unchanged.";
    }
  }
  return fallbackMessage;
}
