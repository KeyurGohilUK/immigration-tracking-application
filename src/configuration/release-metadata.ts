export const APP_VERSION = "3.25.1";

export const RELEASE_NOTES = [
  "Private storage failures now distinguish unavailable storage, full browser quota, interrupted writes, and migration failures.",
  "IndexedDB upgrades are fail-safe and explicitly tested so interrupted migrations do not silently claim success.",
  "Encrypted record and document writes now handle transaction aborts consistently and preserve existing data on failure.",
] as const;
