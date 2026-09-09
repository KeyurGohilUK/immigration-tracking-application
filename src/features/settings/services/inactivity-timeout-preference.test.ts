import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_INACTIVITY_TIMEOUT_MINUTES,
  getInactivityTimeoutMinutes,
  inactivityTimeoutMilliseconds,
  setInactivityTimeoutMinutes,
} from "./inactivity-timeout-preference";

function createStorage(): Storage {
  const values = new Map<string, string>();
  return {
    get length() {
      return values.size;
    },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => void values.delete(key),
    setItem: (key, value) => values.set(key, String(value)),
  };
}

describe("inactivity timeout preference", () => {
  beforeEach(() => vi.stubGlobal("localStorage", createStorage()));
  afterEach(() => vi.unstubAllGlobals());

  it("defaults to five minutes", () => {
    expect(getInactivityTimeoutMinutes()).toBe(
      DEFAULT_INACTIVITY_TIMEOUT_MINUTES,
    );
  });

  it("persists only supported timeout options", () => {
    setInactivityTimeoutMinutes(15);
    expect(getInactivityTimeoutMinutes()).toBe(15);

    localStorage.setItem("urbanfox-inactivity-timeout-minutes", "7");
    expect(getInactivityTimeoutMinutes()).toBe(
      DEFAULT_INACTIVITY_TIMEOUT_MINUTES,
    );
  });

  it("converts the stored minute preference to milliseconds", () => {
    expect(inactivityTimeoutMilliseconds(30)).toBe(30 * 60 * 1000);
  });
});
