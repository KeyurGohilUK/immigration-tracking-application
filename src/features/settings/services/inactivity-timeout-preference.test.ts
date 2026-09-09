import { beforeEach, describe, expect, it } from "vitest";
import {
  DEFAULT_INACTIVITY_TIMEOUT_MINUTES,
  getInactivityTimeoutMinutes,
  inactivityTimeoutMilliseconds,
  setInactivityTimeoutMinutes,
} from "./inactivity-timeout-preference";

describe("inactivity timeout preference", () => {
  beforeEach(() => localStorage.clear());

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
