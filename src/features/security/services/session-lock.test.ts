import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { INACTIVITY_TIMEOUT_MS, startSessionLock } from "./session-lock";

describe("session lock", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("locks after five minutes of inactivity", () => {
    const onLock = vi.fn();
    const stop = startSessionLock(onLock);

    vi.advanceTimersByTime(INACTIVITY_TIMEOUT_MS - 1);
    expect(onLock).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(onLock).toHaveBeenCalledTimes(1);
    stop();
  });

  it("resets the inactivity timer after pointer or keyboard activity", () => {
    const onLock = vi.fn();
    const stop = startSessionLock(onLock);

    vi.advanceTimersByTime(INACTIVITY_TIMEOUT_MS - 1);
    window.dispatchEvent(new Event("pointerdown"));
    vi.advanceTimersByTime(INACTIVITY_TIMEOUT_MS - 1);
    expect(onLock).not.toHaveBeenCalled();

    window.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab" }));
    vi.advanceTimersByTime(INACTIVITY_TIMEOUT_MS);
    expect(onLock).toHaveBeenCalledTimes(1);
    stop();
  });

  it("removes listeners and cancels the timer when the authenticated session ends", () => {
    const onLock = vi.fn();
    const stop = startSessionLock(onLock);

    stop();
    window.dispatchEvent(new Event("pointerdown"));
    vi.advanceTimersByTime(INACTIVITY_TIMEOUT_MS * 2);

    expect(onLock).not.toHaveBeenCalled();
  });
});
