import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearOnboardingPreference,
  getOnboardingPreference,
  saveOnboardingPreference,
  shouldShowFirstUseGuide,
} from "./onboarding-preference";

function createStorage(): Storage {
  const values = new Map<string, string>();
  return {
    get length() {
      return values.size;
    },
    clear: () => values.clear(),
    getItem: (key) => values.get(key) ?? null,
    key: (index) => [...values.keys()][index] ?? null,
    removeItem: (key) => values.delete(key),
    setItem: (key, value) => values.set(key, value),
  };
}

describe("first-use guide preference", () => {
  beforeEach(() => vi.stubGlobal("localStorage", createStorage()));

  it("shows the guide until it is completed or dismissed", () => {
    expect(shouldShowFirstUseGuide()).toBe(true);

    saveOnboardingPreference("dismissed");
    expect(getOnboardingPreference()).toBe("dismissed");
    expect(shouldShowFirstUseGuide()).toBe(false);

    saveOnboardingPreference("completed");
    expect(getOnboardingPreference()).toBe("completed");
    expect(shouldShowFirstUseGuide()).toBe(false);
  });

  it("can be reset with the rest of the local application data", () => {
    saveOnboardingPreference("completed");
    clearOnboardingPreference();

    expect(getOnboardingPreference()).toBeNull();
  });
});
