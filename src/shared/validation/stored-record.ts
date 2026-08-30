interface StoredRecordMetadata {
  createdAt: string;
  id: string;
  updatedAt: string;
  version: number;
}

export function isRecordIdentifier(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.length >= 1 &&
    value.length <= 100 &&
    /^[a-zA-Z0-9][a-zA-Z0-9._:-]*$/.test(value)
  );
}

export function isIsoTimestamp(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const parsed = new Date(value);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString() === value;
}

export function hasValidStoredRecordMetadata(
  value: unknown,
  expectedVersion: number,
): value is StoredRecordMetadata {
  if (!value || typeof value !== "object") return false;
  const record = value as Partial<StoredRecordMetadata>;
  return (
    record.version === expectedVersion &&
    isRecordIdentifier(record.id) &&
    isIsoTimestamp(record.createdAt) &&
    isIsoTimestamp(record.updatedAt) &&
    record.createdAt <= record.updatedAt
  );
}
