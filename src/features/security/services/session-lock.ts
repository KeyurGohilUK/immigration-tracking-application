const INACTIVITY_TIMEOUT_MS = 5 * 60 * 1000;

export function startSessionLock(onLock: () => void): () => void {
  let timeout = window.setTimeout(onLock, INACTIVITY_TIMEOUT_MS);

  const resetTimeout = (): void => {
    window.clearTimeout(timeout);
    timeout = window.setTimeout(onLock, INACTIVITY_TIMEOUT_MS);
  };
  const lockWhenHidden = (): void => {
    if (document.visibilityState === "hidden") {
      onLock();
    }
  };

  for (const eventName of ["pointerdown", "keydown"] as const) {
    window.addEventListener(eventName, resetTimeout);
  }
  document.addEventListener("visibilitychange", lockWhenHidden);

  return () => {
    window.clearTimeout(timeout);
    for (const eventName of ["pointerdown", "keydown"] as const) {
      window.removeEventListener(eventName, resetTimeout);
    }
    document.removeEventListener("visibilitychange", lockWhenHidden);
  };
}
