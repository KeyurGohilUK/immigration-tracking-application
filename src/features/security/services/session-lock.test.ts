import { describe, expect, it, vi } from "vitest";
import {
  INACTIVITY_TIMEOUT_MS,
  startSessionLock,
  type SessionLockEnvironment,
} from "./session-lock";

function createEnvironment() {
  let nextTimerId = 0;
  const timers = new Map<number, { handler: () => void; timeout: number }>();
  const listeners = new Map<string, Set<() => void>>();

  const environment: SessionLockEnvironment = {
    setTimeout: (handler, timeout) => {
      nextTimerId += 1;
      timers.set(nextTimerId, { handler, timeout });
      return nextTimerId;
    },
    clearTimeout: (timerId) => {
      timers.delete(timerId);
    },
    addEventListener: (eventName, handler) => {
      const handlers = listeners.get(eventName) ?? new Set<() => void>();
      handlers.add(handler);
      listeners.set(eventName, handlers);
    },
    removeEventListener: (eventName, handler) => {
      listeners.get(eventName)?.delete(handler);
    },
  };

  return {
    environment,
    timers,
    dispatch: (eventName: "pointerdown" | "keydown") => {
      for (const handler of listeners.get(eventName) ?? []) handler();
    },
  };
}

describe("session lock", () => {
  it("schedules a five-minute inactivity lock", () => {
    const onLock = vi.fn();
    const { environment, timers } = createEnvironment();

    const stop = startSessionLock(onLock, environment);
    expect([...timers.values()]).toEqual([
      { handler: onLock, timeout: INACTIVITY_TIMEOUT_MS },
    ]);

    [...timers.values()][0]?.handler();
    expect(onLock).toHaveBeenCalledTimes(1);
    stop();
  });

  it("resets the inactivity timer after pointer or keyboard activity", () => {
    const onLock = vi.fn();
    const { environment, timers, dispatch } = createEnvironment();

    const stop = startSessionLock(onLock, environment);
    const firstTimerId = [...timers.keys()][0];

    dispatch("pointerdown");
    expect(timers.has(firstTimerId ?? -1)).toBe(false);
    expect(timers.size).toBe(1);

    const secondTimerId = [...timers.keys()][0];
    dispatch("keydown");
    expect(timers.has(secondTimerId ?? -1)).toBe(false);
    expect(timers.size).toBe(1);
    expect([...timers.values()][0]?.timeout).toBe(INACTIVITY_TIMEOUT_MS);
    stop();
  });

  it("removes listeners and cancels the timer when the session ends", () => {
    const onLock = vi.fn();
    const { environment, timers, dispatch } = createEnvironment();

    const stop = startSessionLock(onLock, environment);
    stop();

    expect(timers.size).toBe(0);
    dispatch("pointerdown");
    dispatch("keydown");
    expect(timers.size).toBe(0);
    expect(onLock).not.toHaveBeenCalled();
  });
});
