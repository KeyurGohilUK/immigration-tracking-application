export const DEFAULT_INACTIVITY_TIMEOUT_MINUTES = 5;
export const INACTIVITY_TIMEOUT_OPTIONS = [1, 5, 15, 30] as const;

export type InactivityTimeoutMinutes =
  (typeof INACTIVITY_TIMEOUT_OPTIONS)[number];

const STORAGE_KEY = "urbanfox-inactivity-timeout-minutes";

export function isInactivityTimeoutMinutes(
  value: number,
): value is InactivityTimeoutMinutes {
  return INACTIVITY_TIMEOUT_OPTIONS.includes(value as InactivityTimeoutMinutes);
}

export function getInactivityTimeoutMinutes(): InactivityTimeoutMinutes {
  const stored = Number(localStorage.getItem(STORAGE_KEY));
  return isInactivityTimeoutMinutes(stored)
    ? stored
    : DEFAULT_INACTIVITY_TIMEOUT_MINUTES;
}

export function setInactivityTimeoutMinutes(
  minutes: InactivityTimeoutMinutes,
): void {
  localStorage.setItem(STORAGE_KEY, String(minutes));
}

export function inactivityTimeoutMilliseconds(
  minutes: InactivityTimeoutMinutes,
): number {
  return minutes * 60 * 1000;
}
