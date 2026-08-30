import { describe, expect, it, vi } from "vitest";
import { deleteAllLocalData } from "./local-data-service";

describe("local data deletion", () => {
  it("removes terms acceptance only after every encrypted store is cleared", async () => {
    const calls: string[] = [];

    await deleteAllLocalData({
      clearIndexedDbStores: async () => {
        calls.push("indexed-db");
      },
      clearTermsAcceptance: () => {
        calls.push("terms");
      },
    });

    expect(calls).toEqual(["indexed-db", "terms"]);
  });

  it("preserves terms acceptance when the IndexedDB transaction fails", async () => {
    const clearTermsAcceptance = vi.fn();

    await expect(
      deleteAllLocalData({
        clearIndexedDbStores: () =>
          Promise.reject(new Error("storage unavailable")),
        clearTermsAcceptance,
      }),
    ).rejects.toThrow("storage unavailable");
    expect(clearTermsAcceptance).not.toHaveBeenCalled();
  });
});
