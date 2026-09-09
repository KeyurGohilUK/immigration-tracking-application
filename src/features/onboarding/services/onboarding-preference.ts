export type OnboardingPreference = "completed" | "dismissed";

const STORAGE_KEY = "urbanfox-ilr:first-use-guide-v1";

export function getOnboardingPreference(): OnboardingPreference | null {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === "completed" || value === "dismissed" ? value : null;
  } catch {
    return null;
  }
}

export function shouldShowFirstUseGuide(): boolean {
  return getOnboardingPreference() === null;
}

export function saveOnboardingPreference(
  preference: OnboardingPreference,
): void {
  try {
    localStorage.setItem(STORAGE_KEY, preference);
  } catch {
    // The guide remains usable when browser preferences cannot be persisted.
  }
}

export function clearOnboardingPreference(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // IndexedDB deletion remains the authoritative local-data reset operation.
  }
}
