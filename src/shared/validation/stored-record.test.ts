import { describe, expect, it } from "vitest";
import {
  hasValidStoredRecordMetadata,
  isIsoTimestamp,
  isRecordIdentifier,
} from "./stored-record";

describe("stored record metadata", () => {
  it("accepts canonical internal identifiers and UTC timestamps", () => {
    expect(isRecordIdentifier("family:98f1b5de-1")).toBe(true);
    expect(isIsoTimestamp("2026-08-30T10:15:30.000Z")).toBe(true);
    expect(
      hasValidStoredRecordMetadata(
        {
          version: 1,
          id: "record-1",
          createdAt: "2026-08-30T10:15:30.000Z",
          updatedAt: "2026-08-30T10:16:30.000Z",
        },
        1,
      ),
    ).toBe(true);
  });

  it("rejects unsafe identifiers and non-canonical timestamps", () => {
    expect(isRecordIdentifier(" record ")).toBe(false);
    expect(isRecordIdentifier("<record>")).toBe(false);
    expect(isIsoTimestamp("2026-08-30 10:15:30")).toBe(false);
    expect(isIsoTimestamp("not-a-date")).toBe(false);
  });

  it("rejects records updated before they were created", () => {
    expect(
      hasValidStoredRecordMetadata(
        {
          version: 1,
          id: "record-1",
          createdAt: "2026-08-30T10:16:30.000Z",
          updatedAt: "2026-08-30T10:15:30.000Z",
        },
        1,
      ),
    ).toBe(false);
  });
});
