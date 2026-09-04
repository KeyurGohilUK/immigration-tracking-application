export const INACTIVITY_TIMEOUT_MS = 5 * 60 * 1000;

export interface SessionLockEnvironment {
  setTimeout: (handler: () => void, timeout: number) => number;
  clearTimeout: (timeout: number) => void;
  addEventListener: (
    eventName: "pointerdown" | "keydown",
    handler: () => void,
  ) => void;
  removeEventListener: (
    eventName: "pointerdown" | "keydown",
    handler: () => void,
  ) => void;
}

export function startSessionLock(
  onLock: () => void,
  environment: SessionLockEnvironment = window,
): () => void {
  let timeout = environment.setTimeout(onLock, INACTIVITY_TIMEOUT_MS);

  const resetTimeout = (): void => {
    environment.clearTimeout(timeout);
    timeout = environment.setTimeout(onLock, INACTIVITY_TIMEOUT_MS);
  };

  for (const eventName of ["pointerdown", "keydown"] as const) {
    environment.addEventListener(eventName, resetTimeout);
  }

  return () => {
    environment.clearTimeout(timeout);
    for (const eventName of ["pointerdown", "keydown"] as const) {
      environment.removeEventListener(eventName, resetTimeout);
    }
  };
}
